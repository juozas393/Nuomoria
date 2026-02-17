import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import { ProfileSkeleton } from '../../../components/ui/SkeletonComponents';

interface ProfileData {
    id: string;
    email: string;
    username: string;
    first_name: string | null;
    last_name: string | null;
    phone?: string;
    avatar_url?: string | null;
    created_at?: string;
}

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

const TenantSettingsPage: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Form state
    const [formData, setFormData] = useState({ username: '', first_name: '', last_name: '', phone: '' });
    const [originalData, setOriginalData] = useState({ username: '', first_name: '', last_name: '', phone: '' });
    const [usernameError, setUsernameError] = useState('');
    const [checkingUsername, setCheckingUsername] = useState(false);


    // Delete account modal
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [deletingAccount, setDeletingAccount] = useState(false);

    // Role change modal
    const [showRoleChangeModal, setShowRoleChangeModal] = useState(false);
    const [roleChangeConfirmText, setRoleChangeConfirmText] = useState('');
    const [changingRole, setChangingRole] = useState(false);

    const avatarInputRef = useRef<HTMLInputElement>(null);
    const usernameCheckTimeout = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => { user && fetchProfile(); }, [user]);

    const isDirty = useMemo(() =>
        JSON.stringify(formData) !== JSON.stringify(originalData)
        , [formData, originalData]);

    const fetchProfile = async () => {
        if (!user) { setLoading(false); return; }
        try {
            const [profileRes, userRes] = await Promise.all([
                supabase.from('profiles').select('id, username, avatar_url').eq('id', user.id).maybeSingle(),
                supabase.from('users').select('phone, created_at').eq('id', user.id).maybeSingle()
            ]);
            const pd = profileRes.data;
            const ud = userRes.data;
            const fn = user.first_name && user.first_name !== 'User' ? user.first_name : null;
            const ln = user.last_name && user.last_name !== 'Name' ? user.last_name : null;
            const p: ProfileData = {
                id: user.id,
                email: user.email,
                username: pd?.username || user.email?.split('@')[0] || 'user',
                first_name: fn,
                last_name: ln,
                phone: ud?.phone,
                avatar_url: pd?.avatar_url,
                created_at: ud?.created_at
            };
            setProfile(p);

            const fs = { username: p.username, first_name: p.first_name || '', last_name: p.last_name || '', phone: p.phone || '' };
            setFormData(fs);
            setOriginalData(fs);
        } catch (e) {
            console.error(e);
            setToast({ message: 'Nepavyko užkrauti profilio', type: 'error' });
        }
        finally { setLoading(false); }
    };

    const validateUsername = (u: string) => u.length < 3 ? 'Min. 3 simboliai' : u.length > 24 ? 'Max. 24 simboliai' : !/^[a-zA-Z0-9._-]+$/.test(u) ? 'Netinkami simboliai' : null;

    const checkUsernameAvailability = async (u: string) => {
        if (u === profile?.username) return true;
        try { const { data } = await supabase.rpc('check_username_available', { p_username: u.toLowerCase() }); return data === true; } catch { return false; }
    };

    const handleUsernameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        setFormData(p => ({ ...p, username: v }));
        const err = validateUsername(v);
        if (err) { setUsernameError(err); return; }
        setUsernameError('');
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
        const uv = validateUsername(formData.username);
        if (uv) { setUsernameError(uv); return; }
        if (usernameError) return;
        setSaving(true);
        try {
            await supabase.from('profiles').update({ username: formData.username.toLowerCase() }).eq('id', user.id);
            await supabase.from('users').update({ first_name: formData.first_name || '', last_name: formData.last_name || '', phone: formData.phone || null }).eq('id', user.id);
            const nfs = { username: formData.username.toLowerCase(), first_name: formData.first_name, last_name: formData.last_name, phone: formData.phone };
            setProfile(p => p ? { ...p, ...nfs, first_name: nfs.first_name || null, last_name: nfs.last_name || null } : null);
            setOriginalData(nfs);

            setToast({ message: 'Pakeitimai išsaugoti', type: 'success' });
        } catch (e) {
            console.error(e);
            setToast({ message: 'Nepavyko išsaugoti', type: 'error' });
        }
        finally { setSaving(false); }
    };

    const handleAvatarUpload = async (file: File) => {
        if (!user || !file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) {
            setToast({ message: 'Netinkamas failas (iki 2MB, JPG/PNG)', type: 'error' });
            return;
        }
        setUploadingAvatar(true);
        try {
            const path = `${user.id}/${Date.now()}.${file.name.split('.').pop()}`;
            const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
            if (error) throw error;
            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
            await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
            setProfile(p => p ? { ...p, avatar_url: publicUrl } : null);
            setToast({ message: 'Nuotrauka atnaujinta', type: 'success' });
        } catch {
            setToast({ message: 'Klaida įkeliant nuotrauką', type: 'error' });
        }
        finally { setUploadingAvatar(false); }
    };



    const handleDeleteAccount = async () => {
        if (!user || !profile || deleteConfirmText !== `@${profile.username}`) return;
        setDeletingAccount(true);
        try {
            const now = new Date();
            const purgeDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

            const { error: updateError } = await supabase
                .from('users')
                .update({
                    status: 'DELETED',
                    deleted_at: now.toISOString(),
                    purge_after: purgeDate.toISOString(),
                    updated_at: now.toISOString()
                })
                .eq('id', user.id);

            if (updateError) {
                console.error('Account deletion failed:', updateError.message);
                setToast({ message: 'Nepavyko ištrinti paskyros: ' + updateError.message, type: 'error' });
                setDeletingAccount(false);
                return;
            }

            localStorage.removeItem('direct-auth-session');
            localStorage.removeItem('linkingGoogle');
            localStorage.removeItem('currentUserId');
            localStorage.removeItem('currentUserEmail');
            localStorage.removeItem('signup.role');
            localStorage.removeItem('signup.first_name');
            localStorage.removeItem('signup.last_name');
            localStorage.removeItem('tenant-theme');
            localStorage.removeItem('auth-session-active');

            setToast({ message: 'Paskyra sėkmingai ištrinta. Galėsite ją atkurti per 30 dienų.', type: 'success' });

            try { await logout(); } catch { }

            setTimeout(() => {
                window.location.href = '/login';
            }, 1500);
        } catch (e: any) {
            console.error('Delete account error:', e);
            setToast({ message: 'Nepavyko ištrinti paskyros', type: 'error' });
            setDeletingAccount(false);
        }
    };

    const handleRoleChange = async () => {
        if (!user || !profile || roleChangeConfirmText !== 'KEISTI') return;
        setChangingRole(true);
        try {
            if (user.email) {
                await supabase.from('tenant_invitations').delete().eq('email', user.email);
            }
            await supabase.from('user_addresses').delete().eq('user_id', user.id);
            await supabase.from('profiles').delete().eq('id', user.id);

            const { error: updateError } = await supabase
                .from('users')
                .update({
                    role: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (updateError) {
                console.error('Role reset failed:', updateError.message);
                setToast({ message: 'Nepavyko pakeisti rolės: ' + updateError.message, type: 'error' });
                setChangingRole(false);
                return;
            }

            localStorage.removeItem('direct-auth-session');
            localStorage.removeItem('signup.role');

            setToast({ message: 'Duomenys išvalyti. Nukreipiama į rolės pasirinkimą...', type: 'success' });

            setTimeout(() => {
                window.location.href = '/onboarding';
            }, 1000);
        } catch (e: any) {
            console.error('Role change error:', e);
            setToast({ message: 'Nepavyko pakeisti rolės', type: 'error' });
            setChangingRole(false);
        }
    };

    // Memoized completeness calculation
    const completeness = useMemo(() =>
        profile ? Math.round(([!!profile.avatar_url, !!profile.username, !!profile.first_name, !!profile.last_name, !!profile.phone].filter(Boolean).length / 5) * 100) : 0
        , [profile?.avatar_url, profile?.username, profile?.first_name, profile?.last_name, profile?.phone]);

    const completionItems = useMemo(() => profile ? [
        { key: 'avatar', label: 'Profilio nuotrauka', done: !!profile.avatar_url },
        { key: 'username', label: 'Vartotojo vardas', done: !!profile.username },
        { key: 'first_name', label: 'Vardas', done: !!profile.first_name },
        { key: 'last_name', label: 'Pavardė', done: !!profile.last_name },
        { key: 'phone', label: 'Telefonas', done: !!profile.phone },
    ] : [], [profile?.avatar_url, profile?.username, profile?.first_name, profile?.last_name, profile?.phone]);

    const missingItems = useMemo(() => completionItems.filter(i => !i.done), [completionItems]);

    // Card styling matching landlord profile
    const cardStyle = {
        backgroundImage: "url('/images/CardsBackground.webp')",
        backgroundSize: 'cover',
        backgroundPosition: 'center'
    };

    if (loading) return <ProfileSkeleton />;
    if (!profile) return <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]"><p className="text-gray-500">Nepavyko užkrauti profilio</p></div>;

    const initials = generateInitials(profile.first_name, profile.last_name, profile.username, profile.email);

    return (
        <div className="min-h-screen relative animate-fadeIn">
            {/* Page Background - Same B&W buildings as landlord */}
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

            {/* Compact Header Bar */}
            <div className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-md border-b border-gray-200 z-30">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="h-16 flex items-center justify-between gap-4">
                        {/* Left: Back + Avatar + Username */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate('/tenant')}
                                className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <div
                                onClick={() => avatarInputRef.current?.click()}
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold cursor-pointer ring-2 ring-white shadow-sm transition-transform hover:scale-105"
                                style={{ background: profile.avatar_url ? `url(${profile.avatar_url}) center/cover` : 'linear-gradient(135deg, #2F8481, #4DB6AC)', color: profile.avatar_url ? 'transparent' : 'white' }}
                            >
                                {!profile.avatar_url && initials}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-gray-900">@{profile.username}</span>
                                    <span className="px-2 py-0.5 bg-[#2F8481]/10 text-[#2F8481] text-xs font-medium rounded-md">Nuomininkas</span>
                                </div>
                                <div className="text-xs text-gray-500">{profile.email}</div>
                            </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleSaveProfile}
                                disabled={!isDirty || saving || !!usernameError}
                                className="h-9 px-4 bg-[#2F8481] hover:bg-[#267673] text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                            >
                                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                {saving ? 'Saugoma...' : 'Išsaugoti'}
                            </button>
                            <button onClick={logout} className="h-9 px-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Atsijungti">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hidden file input */}
            <input ref={avatarInputRef} type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])} className="hidden" />

            {/* Spacer for fixed header */}
            <div className="h-20" />

            {/* Main Content - 2 Column Grid (matches landlord) */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* Left Column - Form (7/12) */}
                    <div className="lg:col-span-7 space-y-6">

                        {/* Profile Photo Card */}
                        <div className="backdrop-blur-md rounded-2xl border border-white/50 shadow-lg p-5" style={cardStyle}>
                            <h2 className="text-sm font-semibold text-gray-900 mb-4">Profilio nuotrauka</h2>
                            <div className="flex items-center gap-4">
                                <div className="relative group">
                                    <div
                                        onClick={() => avatarInputRef.current?.click()}
                                        className="w-20 h-20 rounded-2xl flex items-center justify-center text-xl font-bold cursor-pointer transition-transform hover:scale-105 ring-4 ring-white shadow-lg"
                                        style={{ background: profile.avatar_url ? `url(${profile.avatar_url}) center/cover` : 'linear-gradient(135deg, #2F8481, #4DB6AC)', color: profile.avatar_url ? 'transparent' : 'white' }}
                                    >
                                        {!profile.avatar_url && initials}
                                        {uploadingAvatar && <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center"><div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /></div>}
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm text-gray-600 mb-2">JPG, PNG iki 2MB</p>
                                    <button onClick={() => avatarInputRef.current?.click()} className="h-9 px-4 text-sm font-medium text-[#2F8481] bg-[#2F8481]/10 hover:bg-[#2F8481]/20 rounded-lg transition-colors">
                                        {profile.avatar_url ? 'Keisti nuotrauką' : 'Įkelti nuotrauką'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Form Card */}
                        <div className="backdrop-blur-md rounded-2xl border border-white/50 shadow-lg p-5" style={cardStyle}>
                            <h2 className="text-sm font-semibold text-gray-900 mb-4">Asmeninė informacija</h2>
                            <div className="space-y-4">
                                {/* Username */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Vartotojo vardas</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">@</span>
                                        <input
                                            type="text"
                                            value={formData.username}
                                            onChange={handleUsernameChange}
                                            className={`w-full h-11 pl-8 pr-10 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none transition-colors ${usernameError ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-[#2F8481]'}`}
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
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Vardas</label>
                                        <input type="text" value={formData.first_name} onChange={(e) => setFormData(p => ({ ...p, first_name: e.target.value }))}
                                            className="w-full h-11 px-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-[#2F8481] focus:outline-none transition-colors" placeholder="Jonas" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Pavardė</label>
                                        <input type="text" value={formData.last_name} onChange={(e) => setFormData(p => ({ ...p, last_name: e.target.value }))}
                                            className="w-full h-11 px-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-[#2F8481] focus:outline-none transition-colors" placeholder="Jonaitis" />
                                    </div>
                                </div>

                                {/* Phone */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Telefonas</label>
                                    <input type="tel" value={formData.phone} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                                        className="w-full h-11 px-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-[#2F8481] focus:outline-none transition-colors" placeholder="+370 600 00000" />
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Right Column - Summary Cards (5/12) */}
                    <div className="lg:col-span-5 space-y-4">

                        {/* Account Summary Card */}
                        <div className="backdrop-blur-md rounded-2xl border border-white/50 shadow-lg p-5" style={cardStyle}>
                            <h3 className="text-sm font-semibold text-gray-900 mb-3">Paskyros informacija</h3>
                            <div className="space-y-2.5 text-sm">
                                <div className="flex justify-between"><span className="text-gray-500">Rolė</span><span className="font-medium text-gray-900">Nuomininkas</span></div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500">Prisijungimas</span>
                                    <div className="flex items-center gap-1.5">
                                        <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                                        <span className="font-medium text-gray-900">Google</span>
                                    </div>
                                </div>
                                {profile.created_at && <div className="flex justify-between"><span className="text-gray-500">Registracija</span><span className="font-medium text-gray-900">{new Date(profile.created_at).toLocaleDateString('lt-LT')}</span></div>}
                            </div>

                            {/* Profile completion progress */}
                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                                    <span>Profilio užpildymas</span>
                                    <span className="font-semibold text-[#2F8481]">{completeness}%</span>
                                </div>
                                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-[#2F8481] rounded-full transition-all duration-500" style={{ width: `${completeness}%` }} />
                                </div>
                            </div>
                        </div>

                        {/* Profile Completion Checklist */}
                        <div className="backdrop-blur-md rounded-2xl border border-white/50 shadow-lg p-5" style={cardStyle}>
                            <h3 className="text-sm font-semibold text-gray-900 mb-3">Profilio būsena</h3>
                            <div className="space-y-2">
                                {completionItems.map(item => (
                                    <div key={item.key} className="flex items-center gap-2.5 text-sm">
                                        {item.done ? (
                                            <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        ) : (
                                            <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
                                        )}
                                        <span className={item.done ? 'text-gray-500' : 'text-gray-900'}>{item.label}</span>
                                    </div>
                                ))}
                            </div>
                            {missingItems.length > 0 && (
                                <button
                                    onClick={() => document.querySelector('input')?.focus()}
                                    className="mt-4 w-full h-9 text-sm font-medium text-[#2F8481] bg-[#2F8481]/10 hover:bg-[#2F8481]/20 rounded-lg transition-colors"
                                >
                                    Užpildyti trūkstamus laukus ({missingItems.length})
                                </button>
                            )}
                        </div>

                        {/* Danger Zone */}
                        <div className="backdrop-blur-md rounded-2xl border border-white/50 shadow-lg p-5" style={cardStyle}>
                            <div className="flex items-center gap-2 mb-3">
                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                <h3 className="text-sm font-medium text-gray-600">Pavojinga zona</h3>
                            </div>

                            {/* Role Change */}
                            <div className="mb-4 pb-4 border-b border-gray-100">
                                <p className="text-xs text-gray-500 mb-2">
                                    Keičiant rolę, visi duomenys bus ištrinti ir galėsite pasirinkti naują rolę.
                                </p>
                                <button
                                    onClick={() => setShowRoleChangeModal(true)}
                                    className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                                >
                                    Keisti rolę →
                                </button>
                            </div>

                            {/* Delete Account */}
                            <p className="text-xs text-gray-500 mb-2">Paskyros ištrynimas yra negrįžtamas. Visi duomenys bus prarasti.</p>
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

            {/* Delete Account Modal */}
            {showDeleteModal && profile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                        <div className="text-center mb-6">
                            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-7 h-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-1">Ištrinti paskyrą?</h3>
                            <p className="text-sm text-gray-500">Paskyra bus ištrinta. Galėsite atkurti per 30 dienų.</p>
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
                                className="flex-1 h-11 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {deletingAccount ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Trinama...
                                    </>
                                ) : 'Ištrinti'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Role Change Modal */}
            {showRoleChangeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                        <div className="text-center mb-6">
                            <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-7 h-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-1">Keisti rolę?</h3>
                            <p className="text-sm text-gray-500">Visi jūsų duomenys bus ištrinti ir galėsite pasirinkti naują rolę.</p>
                        </div>
                        <div className="mb-5">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Įveskite <span className="font-bold text-amber-600">KEISTI</span> patvirtinimui
                            </label>
                            <input
                                type="text"
                                value={roleChangeConfirmText}
                                onChange={(e) => setRoleChangeConfirmText(e.target.value.toUpperCase())}
                                className="w-full h-11 px-4 border-2 border-gray-200 rounded-xl focus:border-amber-400 focus:outline-none text-center"
                                placeholder="KEISTI"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => { setShowRoleChangeModal(false); setRoleChangeConfirmText(''); }} className="flex-1 h-11 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium">Atšaukti</button>
                            <button
                                onClick={handleRoleChange}
                                disabled={roleChangeConfirmText !== 'KEISTI' || changingRole}
                                className="flex-1 h-11 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {changingRole ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Keičiama...
                                    </>
                                ) : 'Keisti rolę'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};

export default TenantSettingsPage;
