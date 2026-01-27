import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import {
    User,
    Mail,
    Phone,
    Shield,
    Bell,
    Key,
    Trash2,
    ChevronRight,
    ArrowLeft,
    ArrowLeftRight,
    Check,
    AlertTriangle,
    Moon,
    Sun,
    Home,
    Camera,
    Loader2
} from 'lucide-react';

/**
 * TenantSettingsPage - Dedicated settings page for tenant users
 * Stays within tenant layout, never shows landlord components
 */

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

// Theme hook
const useTheme = () => {
    const [isDark, setIsDark] = React.useState(() => {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem('tenant-theme') === 'dark';
    });
    React.useEffect(() => {
        localStorage.setItem('tenant-theme', isDark ? 'dark' : 'light');
    }, [isDark]);
    return { isDark, toggleTheme: () => setIsDark(!isDark) };
};

// Toast component
const Toast: React.FC<{ message: string; type: 'success' | 'error'; onClose: () => void }> = ({ message, type, onClose }) => {
    useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
    return (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
            {type === 'success' ? <Check className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            <span className="text-sm font-medium">{message}</span>
        </div>
    );
};

const TenantSettingsPage: React.FC = () => {
    const { user, logout, updateUserFields } = useAuth();
    const navigate = useNavigate();
    const { isDark, toggleTheme } = useTheme();

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

    // Password modal
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [hasPassword, setHasPassword] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [settingPassword, setSettingPassword] = useState(false);

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

    // Card styling
    const cardBase = isDark
        ? 'bg-gray-900/90 backdrop-blur-xl border border-white/10'
        : 'bg-white/90 backdrop-blur-xl border border-gray-200/60 shadow-sm';

    useEffect(() => {
        if (user) fetchProfile();
    }, [user]);

    const isDirty = useMemo(() =>
        JSON.stringify(formData) !== JSON.stringify(originalData)
        , [formData, originalData]);

    const fetchProfile = async () => {
        if (!user) { setLoading(false); return; }
        try {
            const [profileRes, userRes] = await Promise.all([
                supabase.from('profiles').select('id, username, avatar_url, has_password').eq('id', user.id).maybeSingle(),
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
            setHasPassword(pd?.has_password || false);
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
            // Update AuthContext so header shows changes immediately (batch update)
            updateUserFields({
                username: formData.username.toLowerCase(),
                first_name: formData.first_name || '',
                last_name: formData.last_name || '',
            });
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
            const path = `avatars/${user.id}-${Date.now()}.${file.name.split('.').pop()}`;
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

    const handleSetPassword = async () => {
        setPasswordError('');
        setPasswordSuccess('');
        if (!newPassword) { setPasswordError('Slaptažodis privalomas'); return; }
        if (newPassword.length < 8) { setPasswordError('Slaptažodis turi būti mažiausiai 8 simbolių'); return; }
        if (newPassword !== confirmPassword) { setPasswordError('Slaptažodžiai nesutampa'); return; }
        setSettingPassword(true);
        try {
            const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
            if (updateError) throw updateError;
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                await supabase.from('profiles').update({ has_password: true }).eq('id', session.user.id);
            }
            setPasswordSuccess(hasPassword ? 'Slaptažodis sėkmingai pakeistas' : 'Slaptažodis sėkmingai sukurtas');
            setHasPassword(true);
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => { setShowPasswordModal(false); setPasswordSuccess(''); }, 2000);
        } catch (error: any) {
            console.error('Error setting password:', error);
            setPasswordError(error.message || 'Nepavyko nustatyti slaptažodžio');
        } finally {
            setSettingPassword(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!user || !profile || deleteConfirmText !== `@${profile.username}`) return;
        setDeletingAccount(true);
        try {
            // Soft delete - mark account as DELETED with 30-day grace period
            const now = new Date();
            const purgeDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

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

            // Clear all localStorage auth state
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

            // Redirect after short delay to show success message
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
            // 1. Delete all user-related data
            // Delete tenant invitations
            if (user.email) {
                await supabase.from('tenant_invitations').delete().eq('email', user.email);
            }

            // Delete user_addresses
            await supabase.from('user_addresses').delete().eq('user_id', user.id);

            // Delete profile (but keep user row)
            await supabase.from('profiles').delete().eq('id', user.id);

            // 2. Reset role to NULL (triggers onboarding)
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

            // Clear localStorage
            localStorage.removeItem('direct-auth-session');
            localStorage.removeItem('signup.role');

            setToast({ message: 'Duomenys išvalyti. Nukreipiama į rolės pasirinkimą...', type: 'success' });

            // Redirect to onboarding
            setTimeout(() => {
                window.location.href = '/onboarding';
            }, 1000);
        } catch (e: any) {
            console.error('Role change error:', e);
            setToast({ message: 'Nepavyko pakeisti rolės', type: 'error' });
            setChangingRole(false);
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const userName = (user as any)?.user_metadata?.full_name || user?.first_name || user?.email?.split('@')[0] || 'Naudotojas';
    const userAvatar = profile?.avatar_url || (user as any)?.user_metadata?.avatar_url;

    const generateInitials = () => {
        if (formData.username) return formData.username.slice(0, 2).toUpperCase();
        if (formData.first_name || formData.last_name) {
            return ((formData.first_name?.[0] || '') + (formData.last_name?.[0] || '')).toUpperCase();
        }
        if (user?.email) return user.email.split('@')[0].slice(0, 2).toUpperCase();
        return '?';
    };

    if (loading) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
                <div className="text-center">
                    <div className="w-10 h-10 border-4 border-[#2F8481] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-gray-500">Kraunama...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen relative ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {/* Background */}
            <div className="fixed inset-0 z-0">
                {!isDark ? (
                    <>
                        <img src="/images/tenant-bg.png" alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-white/60" />
                    </>
                ) : (
                    <div className="w-full h-full bg-gray-900" />
                )}
            </div>

            {/* Header */}
            <header className={`sticky top-0 z-50 ${cardBase} border-b`}>
                <div className="max-w-4xl mx-auto px-4 sm:px-6">
                    <div className="flex items-center justify-between h-14">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate('/tenant')}
                                className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`}
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <span className="font-semibold text-lg">Paskyros nustatymai</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button onClick={toggleTheme} className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`}>
                                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                            </button>
                            <button
                                onClick={() => navigate('/tenant')}
                                className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`}
                            >
                                <Home className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">

                {/* Profile Section */}
                <section className={`${cardBase} rounded-2xl p-6`}>
                    <h2 className="text-lg font-semibold mb-6">Profilio informacija</h2>

                    <div className="flex flex-col sm:flex-row gap-6">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                            <div className="relative group">
                                <div
                                    onClick={() => avatarInputRef.current?.click()}
                                    className="w-24 h-24 rounded-2xl flex items-center justify-center text-2xl font-bold cursor-pointer transition-transform hover:scale-105 ring-4 ring-white shadow-lg overflow-hidden"
                                    style={{
                                        background: userAvatar ? `url(${userAvatar}) center/cover` : 'linear-gradient(135deg, #2F8481, #4DB6AC)',
                                        color: userAvatar ? 'transparent' : 'white'
                                    }}
                                >
                                    {!userAvatar && generateInitials()}
                                    {uploadingAvatar && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                            <Loader2 className="w-6 h-6 text-white animate-spin" />
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => avatarInputRef.current?.click()}
                                    className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#2F8481] rounded-full flex items-center justify-center shadow-lg hover:bg-[#267673] transition-colors"
                                >
                                    <Camera className="w-4 h-4 text-white" />
                                </button>
                            </div>
                            <input
                                ref={avatarInputRef}
                                type="file"
                                accept="image/*"
                                onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])}
                                className="hidden"
                            />
                        </div>

                        {/* Form Fields */}
                        <div className="flex-1 space-y-4">
                            {/* Username */}
                            <div>
                                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1.5`}>Vartotojo vardas</label>
                                <div className="relative">
                                    <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>@</span>
                                    <input
                                        type="text"
                                        value={formData.username}
                                        onChange={handleUsernameChange}
                                        className={`w-full h-11 pl-8 pr-10 rounded-xl transition-colors ${isDark
                                            ? 'bg-white/5 border border-white/10 focus:border-[#2F8481] text-white'
                                            : 'bg-gray-50 border border-gray-200 focus:border-[#2F8481]'
                                            } ${usernameError ? 'border-red-400' : ''} focus:outline-none`}
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        {checkingUsername && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                                        {!checkingUsername && formData.username.length >= 3 && !usernameError && <Check className="w-4 h-4 text-emerald-500" />}
                                    </div>
                                </div>
                                {usernameError && <p className="mt-1 text-xs text-red-500">{usernameError}</p>}
                            </div>

                            {/* Name fields */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1.5`}>Vardas</label>
                                    <input
                                        type="text"
                                        value={formData.first_name}
                                        onChange={(e) => setFormData(p => ({ ...p, first_name: e.target.value }))}
                                        placeholder="Jonas"
                                        className={`w-full h-11 px-3 rounded-xl transition-colors ${isDark
                                            ? 'bg-white/5 border border-white/10 focus:border-[#2F8481] text-white placeholder-gray-500'
                                            : 'bg-gray-50 border border-gray-200 focus:border-[#2F8481] placeholder-gray-400'
                                            } focus:outline-none`}
                                    />
                                </div>
                                <div>
                                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1.5`}>Pavardė</label>
                                    <input
                                        type="text"
                                        value={formData.last_name}
                                        onChange={(e) => setFormData(p => ({ ...p, last_name: e.target.value }))}
                                        placeholder="Jonaitis"
                                        className={`w-full h-11 px-3 rounded-xl transition-colors ${isDark
                                            ? 'bg-white/5 border border-white/10 focus:border-[#2F8481] text-white placeholder-gray-500'
                                            : 'bg-gray-50 border border-gray-200 focus:border-[#2F8481] placeholder-gray-400'
                                            } focus:outline-none`}
                                    />
                                </div>
                            </div>

                            {/* Phone */}
                            <div>
                                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1.5`}>Telefonas</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                                    placeholder="+370 600 00000"
                                    className={`w-full h-11 px-3 rounded-xl transition-colors ${isDark
                                        ? 'bg-white/5 border border-white/10 focus:border-[#2F8481] text-white placeholder-gray-500'
                                        : 'bg-gray-50 border border-gray-200 focus:border-[#2F8481] placeholder-gray-400'
                                        } focus:outline-none`}
                                />
                            </div>

                            {/* Email (read-only) */}
                            <div>
                                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1.5`}>El. paštas</label>
                                <div className={`flex items-center gap-2 h-11 px-3 rounded-xl ${isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-100 border border-gray-200'}`}>
                                    <Mail className="w-4 h-4 text-gray-400" />
                                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{user?.email}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Save button */}
                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={handleSaveProfile}
                            disabled={!isDirty || saving || !!usernameError}
                            className="h-10 px-6 bg-[#2F8481] hover:bg-[#267673] text-white rounded-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            {saving ? 'Saugoma...' : 'Išsaugoti pakeitimus'}
                        </button>
                    </div>
                </section>

                {/* Security Section */}
                <section className={`${cardBase} rounded-2xl p-6`}>
                    <h2 className="text-lg font-semibold mb-4">Saugumas</h2>

                    <div className="space-y-3">
                        {/* Google OAuth */}
                        <div className={`flex items-center justify-between p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-sm font-medium">Google</div>
                                    <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Prisijungimas per Google OAuth</div>
                                </div>
                            </div>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Prijungta</span>
                        </div>

                        {/* Password */}
                        <div className={`flex items-center justify-between p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full ${isDark ? 'bg-white/10' : 'bg-gray-100'} flex items-center justify-center`}>
                                    <Key className="w-5 h-5 text-gray-500" />
                                </div>
                                <div>
                                    <div className="text-sm font-medium">Slaptažodis</div>
                                    <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                        {hasPassword ? 'Slaptažodis nustatytas' : 'Pridėkite slaptažodį prisijungimui'}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowPasswordModal(true)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium ${isDark
                                    ? 'bg-white/10 hover:bg-white/15 text-white'
                                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                                    } transition-colors`}
                            >
                                {hasPassword ? 'Keisti' : 'Sukurti'}
                            </button>
                        </div>
                    </div>
                </section>

                {/* Danger Zone */}
                <section className={`${cardBase} rounded-2xl p-6`}>
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <h2 className="text-sm font-medium text-red-600">Pavojinga zona</h2>
                    </div>

                    {/* Role Change */}
                    <div className="mb-4 pb-4 border-b border-gray-200/50">
                        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'} mb-2`}>
                            Keičiant rolę, visi duomenys bus ištrinti ir galėsite pasirinkti naują rolę.
                        </p>
                        <button
                            onClick={() => setShowRoleChangeModal(true)}
                            className="text-sm text-amber-600 hover:text-amber-700 font-medium hover:underline flex items-center gap-1"
                        >
                            <ArrowLeftRight className="w-3 h-3" />
                            Keisti rolę →
                        </button>
                    </div>

                    {/* Delete Account */}
                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'} mb-2`}>
                        Paskyros ištrynimas. Galėsite atkurti per 30 dienų.
                    </p>
                    <button
                        onClick={() => setShowDeleteModal(true)}
                        className="text-sm text-red-600 hover:text-red-700 font-medium hover:underline"
                    >
                        Ištrinti paskyrą →
                    </button>
                </section>

            </main>

            {/* Password Modal */}
            {showPasswordModal && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                    onClick={() => setShowPasswordModal(false)}
                >
                    <div
                        className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 max-w-md w-full shadow-2xl`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-xl font-bold mb-2">
                            {hasPassword ? 'Keisti slaptažodį' : 'Sukurti slaptažodį'}
                        </h3>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-6`}>
                            {hasPassword ? 'Įveskite naują slaptažodį' : 'Pridėkite slaptažodį prisijungimui'}
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1.5`}>
                                    Naujas slaptažodis
                                </label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Mažiausiai 8 simboliai"
                                    className={`w-full h-11 px-3 rounded-lg ${isDark
                                        ? 'bg-white/5 border border-white/10 text-white'
                                        : 'bg-gray-50 border border-gray-200'
                                        } focus:border-[#2F8481] focus:outline-none`}
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1.5`}>
                                    Pakartokite slaptažodį
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Pakartokite slaptažodį"
                                    className={`w-full h-11 px-3 rounded-lg ${isDark
                                        ? 'bg-white/5 border border-white/10 text-white'
                                        : 'bg-gray-50 border border-gray-200'
                                        } focus:border-[#2F8481] focus:outline-none`}
                                />
                            </div>

                            {passwordError && (
                                <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                                    {passwordError}
                                </div>
                            )}
                            {passwordSuccess && (
                                <div className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
                                    {passwordSuccess}
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => {
                                        setShowPasswordModal(false);
                                        setPasswordError('');
                                        setPasswordSuccess('');
                                        setNewPassword('');
                                        setConfirmPassword('');
                                    }}
                                    className={`flex-1 h-11 rounded-lg font-medium ${isDark
                                        ? 'bg-white/10 hover:bg-white/15 text-white'
                                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                        } transition-colors`}
                                    disabled={settingPassword}
                                >
                                    Atšaukti
                                </button>
                                <button
                                    onClick={handleSetPassword}
                                    disabled={settingPassword || !newPassword || !confirmPassword}
                                    className="flex-1 h-11 px-4 bg-[#2F8481] text-white rounded-lg font-medium hover:bg-[#267673] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {settingPassword ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Nustatoma...
                                        </>
                                    ) : (
                                        hasPassword ? 'Keisti' : 'Sukurti'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Account Modal */}
            {showDeleteModal && profile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-2xl max-w-md w-full p-6`}>
                        <div className="text-center mb-6">
                            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-7 h-7 text-red-600" />
                            </div>
                            <h3 className="text-xl font-bold mb-1">Ištrinti paskyrą?</h3>
                            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Visi duomenys bus prarasti negrįžtamai.</p>
                        </div>
                        <div className="mb-5">
                            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                                Įveskite <span className="font-bold text-red-600">@{profile.username}</span> patvirtinimui
                            </label>
                            <input
                                type="text"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                className={`w-full h-11 px-4 border-2 rounded-xl focus:outline-none text-center ${isDark
                                    ? 'bg-white/5 border-white/10 focus:border-red-400 text-white'
                                    : 'bg-white border-gray-200 focus:border-red-400'
                                    }`}
                                placeholder={`@${profile.username}`}
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
                                className={`flex-1 h-11 rounded-xl font-medium ${isDark
                                    ? 'bg-white/10 hover:bg-white/15 text-white'
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                    }`}
                            >
                                Atšaukti
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={deleteConfirmText !== `@${profile.username}` || deletingAccount}
                                className="flex-1 h-11 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {deletingAccount ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
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
                    <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-2xl max-w-md w-full p-6`}>
                        <div className="text-center mb-6">
                            <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <ArrowLeftRight className="w-7 h-7 text-amber-600" />
                            </div>
                            <h3 className="text-xl font-bold mb-1">Keisti rolę?</h3>
                            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                Visi jūsų duomenys bus ištrinti ir galėsite pasirinkti naują rolę.
                            </p>
                        </div>
                        <div className="mb-5">
                            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                                Įveskite <span className="font-bold text-amber-600">KEISTI</span> patvirtinimui
                            </label>
                            <input
                                type="text"
                                value={roleChangeConfirmText}
                                onChange={(e) => setRoleChangeConfirmText(e.target.value.toUpperCase())}
                                className={`w-full h-11 px-4 border-2 rounded-xl focus:outline-none text-center ${isDark
                                    ? 'bg-white/5 border-white/10 focus:border-amber-400 text-white'
                                    : 'bg-white border-gray-200 focus:border-amber-400'
                                    }`}
                                placeholder="KEISTI"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowRoleChangeModal(false); setRoleChangeConfirmText(''); }}
                                className={`flex-1 h-11 rounded-xl font-medium ${isDark
                                    ? 'bg-white/10 hover:bg-white/15 text-white'
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                    }`}
                            >
                                Atšaukti
                            </button>
                            <button
                                onClick={handleRoleChange}
                                disabled={roleChangeConfirmText !== 'KEISTI' || changingRole}
                                className="flex-1 h-11 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {changingRole ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
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
