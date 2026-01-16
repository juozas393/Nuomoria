import type { UserWithPermissions } from '../types/user';

const CLEAN_SENTINELS = new Set(['User', 'Name', 'User Name']);

const cleanValue = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (CLEAN_SENTINELS.has(trimmed)) return null;
  return trimmed;
};

export const getUserDisplayName = (user: UserWithPermissions | null | undefined): string => {
  if (!user) return 'Paskyra';

  const first = cleanValue(user.first_name);
  const last = cleanValue(user.last_name);

  if (first && last) return `${first} ${last}`;
  if (first) return first;

  const nickname = cleanValue(user.nickname);
  if (nickname) return nickname;

  if (last) return last;

  const combined = cleanValue(user.name);
  if (combined) return combined;

  if (user.email) return user.email.split('@')[0];

  return 'Paskyra';
};

export const getUserSecondaryLabel = (user: UserWithPermissions | null | undefined): string => {
  if (!user) return 'Neprisijungęs';
  if (user.nickname) return `@${user.nickname}`;
  return user.email || 'Neprisijungęs';
};

export const getUserInitials = (user: UserWithPermissions | null | undefined): string => {
  if (!user) return 'U';

  const first = cleanValue(user.first_name);
  const last = cleanValue(user.last_name);
  const nickname = cleanValue(user.nickname);

  if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
  if (first) return first[0].toUpperCase();
  if (nickname) return nickname[0].toUpperCase();
  if (last) return last[0].toUpperCase();
  if (user.email) return user.email[0].toUpperCase();
  return 'U';
};

export const translateUserRole = (role?: string | null): string => {
  switch (role) {
    case 'admin':
      return 'Administratorius';
    case 'landlord':
      return 'Nuomotojas';
    case 'property_manager':
      return 'Turto administratorius';
    case 'tenant':
      return 'Nuomininkas';
    case 'maintenance':
      return 'Priežiūros specialistas';
    default:
      return 'Vartotojas';
  }
};














