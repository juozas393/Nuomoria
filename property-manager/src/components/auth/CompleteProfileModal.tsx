import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/user';
import { getDefaultRouteForRole } from '../../utils/roleRouting';

type Props = {
  open: boolean;
};

type SignupRole = Extract<UserRole, 'tenant' | 'landlord'>;

const nicknamePattern = /^[a-z0-9._]{3,20}$/;

export default function CompleteProfileModal({ open }: Props) {
  const { user, completeProfile } = useAuth();
  const navigate = useNavigate();
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<SignupRole>('tenant');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roleOptions = useMemo(
    () => [
      {
        value: 'landlord' as SignupRole,
        title: 'Esu nuomotojas',
        description: 'Valdau kelis objektus, noriu sekti nuomotojo rodiklius.',
      },
      {
        value: 'tenant' as SignupRole,
        title: 'Esu nuomininkas',
        description: 'Noriu matyti savo nuomos mokėjimus ir sąskaitas.',
      },
    ],
    [],
  );

  useEffect(() => {
    if (open) {
      setNickname(user?.nickname ?? '');
      setPassword('');
      setConfirmPassword('');
      setError('');
      setSuccess('');
      const initialRole: SignupRole =
        user?.role === 'landlord' || user?.role === 'tenant' ? user.role : 'tenant';
      setSelectedRole(initialRole);
    }
  }, [open, user?.nickname, user?.role]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const trimmedNickname = nickname.trim().toLowerCase();

    if (!nicknamePattern.test(trimmedNickname)) {
      setError('Vartotojo vardas turi būti 3–20 simbolių, leidžiamos raidės, skaičiai, taškas ir pabraukimas.');
      return;
    }

    if (password.length < 8) {
      setError('Slaptažodis turi būti bent 8 simbolių ilgio.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Slaptažodžiai nesutampa.');
      return;
    }

    setIsSubmitting(true);
    const result = await completeProfile(trimmedNickname, password, selectedRole);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error ?? 'Nepavyko išsaugoti profilio.');
      return;
    }

    setSuccess('Profilis sėkmingai atnaujintas! Nukreipiama…');

    try {
      const targetEmail = user?.google_email ?? user?.email ?? '';
      localStorage.setItem('google_linked', 'true');
      if (targetEmail) {
        localStorage.setItem('google_email', targetEmail);
      }
    } catch {
      // ignore storage errors
    }

    const targetRoute = getDefaultRouteForRole(selectedRole);
    setTimeout(() => {
      navigate(targetRoute, { replace: true });
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
        <div className="border-b border-gray-200 px-6 py-5">
          <h2 className="text-xl font-semibold text-black">Užbaikite paskyros kūrimą</h2>
          <p className="mt-1 text-sm text-gray-600">
            Sukurkite unikalų vartotojo vardą, slaptažodį ir pasirinkite, kaip naudosite sistemą. Vėliau galėsite
            prisijungti tiek su Google paskyra, tiek su naujai sukurtais duomenimis.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div>
            <label htmlFor="nickname" className="mb-1 block text-sm font-medium text-gray-700">
              Vartotojo vardas
            </label>
            <input
              id="nickname"
              name="nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#2f8481] focus:outline-none focus:ring-2 focus:ring-[#2f8481]"
              placeholder="pvz. turto.valdytojas"
              autoComplete="off"
            />
            <p className="mt-1 text-xs text-gray-500">3–20 simbolių. Leidžiamos raidės, skaičiai, taškas ir pabraukimas.</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Pasirinkite rolę</p>
            <div className="space-y-3">
              {roleOptions.map((option) => {
                const isActive = selectedRole === option.value;
                return (
                  <label
                    key={option.value}
                    className={`block rounded-2xl border-2 px-4 py-3 text-sm transition ${
                      isActive ? 'border-[#2f8481] bg-[#2f8481]/10 shadow-sm' : 'border-gray-200 hover:border-[#2f8481]/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="signup-role"
                      value={option.value}
                      checked={isActive}
                      onChange={() => setSelectedRole(option.value)}
                      className="sr-only"
                    />
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-black">{option.title}</p>
                        <p className="mt-1 text-xs text-gray-600">{option.description}</p>
                      </div>
                      <span
                        className={`mt-1 inline-flex h-3 w-3 rounded-full border ${
                          isActive ? 'border-[#2f8481] bg-[#2f8481]' : 'border-gray-300'
                        }`}
                        aria-hidden
                      />
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
              Naujas slaptažodis
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#2f8481] focus:outline-none focus:ring-2 focus:ring-[#2f8481]"
              placeholder="Mažiausiai 8 simboliai"
              autoComplete="new-password"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-gray-700">
              Pakartokite slaptažodį
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#2f8481] focus:outline-none focus:ring-2 focus:ring-[#2f8481]"
              placeholder="Pakartokite slaptažodį"
              autoComplete="new-password"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-[#2f8481] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#276f6c] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? 'Išsaugoma...' : 'Išsaugoti'}
          </button>
        </form>
      </div>
    </div>
  );
}