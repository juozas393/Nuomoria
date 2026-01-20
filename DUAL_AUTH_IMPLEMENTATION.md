# Dual Authentication System Implementation Guide

## Overview

This system implements dual authentication for Nuomoria:
- **Primary:** Google OAuth (required for new users)
- **Secondary:** Username + Password (optional, set after Google auth)

## Key Principles

1. **New users MUST use Google OAuth first**
2. **Username+password is optional** and can only be set after creating account via Google
3. **Username is globally unique** and used for login
4. **Email from Google** is the account email and links both auth methods

---

## Database Schema

### `profiles` Table

```sql
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  username text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('landlord', 'tenant')),
  has_password boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### RPC Functions

#### `get_login_info_by_username(lookup_username text)`
- **Purpose:** Secure username lookup for login
- **Returns:** `user_id`, `email`, `has_password`
- **Security:** DEFINER function, only exposes necessary fields
- **Used by:** Username/password login form

#### `check_username_available(check_username text)`
- **Purpose:** Real-time username availability check
- **Returns:** `boolean` (true if available)
- **Validates:** Format (3-20 chars, a-z 0-9 . _ -) and uniqueness
- **Used by:** Onboarding page

### RLS Policies

- Users can **view/insert/update** own profile only
- Public username lookup is handled via secure RPC (not direct SELECT)

---

## User Flows

### Flow 1: New User (Google OAuth)

```
1. User clicks "Continue with Google" → Google OAuth
2. Callback redirects to /auth/callback
3. System checks if profile exists
   → NO PROFILE: Redirect to /onboarding
4. Onboarding page:
   - User chooses username (validated in real-time)
   - User selects role (landlord/tenant)
   - OPTIONAL: User can add password
5. Profile created with has_password flag
6. Redirect to dashboard based on role
```

### Flow 2: Existing User (Google OAuth)

```
1. User clicks "Continue with Google" → Google OAuth
2. Callback redirects to /auth/callback
3. System checks profile → FOUND
4. Redirect to dashboard based on role
```

### Flow 3: Existing User (Username + Password)

```
1. User clicks "Sign in with username"
2. Accordion expands showing username + password fields
3. User enters username + password
4. Frontend calls get_login_info_by_username RPC
5. Check has_password flag:
   → FALSE: Show error "Password not set. Use Google and set password in Settings"
   → TRUE: Call supabase.auth.signInWithPassword(email, password)
6. On success: Redirect to dashboard
```

### Flow 4: Adding Password (Existing User)

```
1. User navigates to /settings
2. Under "Login methods" section, clicks "Create password"
3. Modal appears with password + confirm fields
4. User enters password (min 8 chars)
5. Call supabase.auth.updateUser({ password })
6. Update profiles.has_password = true
7. Success message → User can now login with username+password
```

---

## Components

### `LoginPage.tsx`
- **Location:** `apps/web/src/features/auth/pages/LoginPage.tsx`
- **Features:**
  - Primary Google OAuth button
  - Secondary username/password accordion
  - Lithuanian copy
  - Premium SaaS design
  - Clear error states

### `OnboardingPage.tsx`
- **Location:** `apps/web/src/features/auth/pages/OnboardingPage.tsx`
- **Features:**
  - Username input with real-time availability check
  - Role selection (landlord/tenant) with icons
  - Optional password toggle
  - Validation and error handling
  - Creates profile + sets password if opted in

### `OnboardingWrapper.tsx`
- **Location:** `apps/web/src/features/auth/pages/OnboardingWrapper.tsx`
- **Purpose:** Protects onboarding route, checks auth state
- **Logic:**
  - No session → redirect to /login
  - Has profile → redirect to dashboard
  - Passes user email/ID to OnboardingPage

### `SupabaseAuthCallback.tsx`
- **Location:** `apps/web/src/pages/SupabaseAuthCallback.tsx`
- **Features:**
  - Handles OAuth code exchange
  - Checks for existing session (no code param)
  - Checks if user has profile
  - Routes to onboarding or dashboard accordingly
  - NO PKCE errors when code is missing

### `Settings.tsx`
- **Location:** `apps/web/src/pages/Settings.tsx`
- **Features:**
  - "Login methods" section
  - Shows Google (connected)
  - Shows Password status (Set/Not set)
  - "Create password" or "Change password" button
  - Modal for password entry with validation

### `UsernameLoginForm.tsx`
- **Location:** `apps/web/src/features/auth/components/UsernameLoginForm.tsx`
- **Features:**
  - Compact accordion (collapsed by default)
  - Username + password inputs
  - "Forgot password?" link (shows modal with instructions)
  - Calls RPC to lookup email by username
  - Checks has_password flag
  - Clear error states

### `GoogleButton.tsx`
- **Location:** `apps/web/src/features/auth/components/GoogleButton.tsx`
- **Features:**
  - Premium gradient design
  - Micro-interactions (hover lift, shadow)
  - Loading state

---

## Routes

### Public Routes
- `/login` - Login page (Google + username/password)
- `/auth/callback` - OAuth callback handler
- `/onboarding` - First-time user profile completion (requires auth, no profile)

### Protected Routes
- `/` or `/nuomotojas2` - Landlord dashboard
- `/tenant/dashboard` - Tenant dashboard
- `/settings` - User settings (includes password management)

---

## Security Considerations

### 1. Username Enumeration
- **Issue:** Attackers could enumerate valid usernames
- **Mitigation:** 
  - Keep errors generic in UI
  - RPC functions don't expose sensitive data
  - Rate limiting on frontend (future: implement backend rate limiting)

### 2. Email Mismatch
- **Issue:** User tries to set password for different email than Google
- **Prevention:** Password can only be set by authenticated user for their own account

### 3. RLS Policies
- All profile operations restricted to owner (auth.uid() = id)
- Username lookup via secure DEFINER RPC

### 4. Password Strength
- Minimum 8 characters enforced
- Supabase Auth handles hashing/salting

---

## Error States

### Login Page Errors

| Error | When | Message (Lithuanian) |
|-------|------|---------------------|
| Username not found | Username doesn't exist in DB | "Vartotojo vardas nerastas" |
| Password not set | has_password = false | "Slaptažodis dar nesukurtas. Prisijunkite su Google..." |
| Wrong password | Invalid password | "Neteisingas slaptažodis" |
| General error | Any other error | "Klaida prisijungiant. Bandykite dar kartą." |

### Onboarding Page Errors

| Error | When | Message |
|-------|------|---------|
| Username too short | < 3 chars | "Mažiausiai 3 simboliai" |
| Username too long | > 20 chars | "Daugiausiai 20 simbolių" |
| Invalid format | Non a-z0-9._- | "Tik mažosios raidės, skaičiai, taškai, brūkšneliai" |
| Username taken | Already exists | "Šis vartotojo vardas jau užimtas" |
| No role selected | Role empty | "Pasirinkite vaidmenį" |
| Password mismatch | Passwords don't match | "Slaptažodžiai nesutampa" |
| Password too short | < 8 chars | "Mažiausiai 8 simboliai" |

### Settings Page Errors

| Error | When | Message |
|-------|------|---------|
| Password too short | < 8 chars | "Slaptažodis turi būti mažiausiai 8 simbolių" |
| Password mismatch | Passwords don't match | "Slaptažodžiai nesutampa" |
| Update failed | Supabase error | "Nepavyko nustatyti slaptažodžio" |

---

## Testing Checklist

### New User Flow
- [ ] New user can sign in with Google
- [ ] Redirected to onboarding after first Google sign-in
- [ ] Username availability check works in real-time
- [ ] Can't submit invalid username
- [ ] Can't submit without selecting role
- [ ] Can create account without password
- [ ] Can create account with password
- [ ] Redirected to correct dashboard based on role

### Existing User Flow (Google)
- [ ] Existing user can sign in with Google
- [ ] Redirected directly to dashboard (no onboarding)

### Username+Password Login
- [ ] Can't login with username if password not set
- [ ] Error message clear when password not set
- [ ] Can login with username+password if set
- [ ] Wrong password shows correct error
- [ ] Non-existent username shows correct error

### Password Management
- [ ] Can access Settings page
- [ ] Shows "Password not set" initially
- [ ] Can create password in Settings
- [ ] After creating password, flag updates to has_password=true
- [ ] Can change existing password
- [ ] Password validation works (min 8 chars, match confirmation)

### Security
- [ ] Can't access onboarding without auth
- [ ] Can't modify other users' profiles
- [ ] RLS policies block unauthorized access
- [ ] Username lookup doesn't expose sensitive data

---

## Migration Steps

### 1. Database
```bash
# Apply migration
supabase db push

# Or manually run:
supabase db execute -f supabase/migrations/20250117_dual_auth_system.sql
```

### 2. Google OAuth Configuration
1. Go to Supabase Dashboard → Authentication → Providers
2. Enable Google provider
3. Add Client ID and Client Secret from Google Cloud Console
4. Set redirect URL: `https://your-project.supabase.co/auth/v1/callback`

### 3. Test Locally
```bash
cd apps/web
npm run dev
```

### 4. Test Flows
- Create new user via Google
- Complete onboarding
- Sign out
- Sign in with username+password
- Add password in Settings
- Test all error states

---

## Future Enhancements

1. **Rate Limiting**
   - Implement backend rate limiting for username lookup
   - Prevent brute force attacks

2. **Password Recovery**
   - Email-based password reset flow
   - Currently shows "Use Google and reset in Settings"

3. **2FA** (Two-Factor Authentication)
   - Optional TOTP-based 2FA
   - SMS-based 2FA

4. **Social Auth**
   - Add more providers (GitHub, Microsoft, etc.)

5. **Username Change**
   - Allow users to change username (with validation)

6. **Audit Log**
   - Track login attempts, password changes
   - Security notifications

---

## Troubleshooting

### PKCE Error on Callback
**Problem:** `exchangeCodeForSession` fails when no code param

**Solution:** Check for `code` param before calling `exchangeCodeForSession`:
```typescript
const code = searchParams.get('code');
if (code) {
  await supabase.auth.exchangeCodeForSession(code);
} else {
  const { data: { session } } = await supabase.auth.getSession();
}
```

### Username Already Taken
**Problem:** Username unique constraint violation

**Solution:** 
- Use real-time check in onboarding
- Handle duplicate key error gracefully
- Show user-friendly message

### has_password Not Updating
**Problem:** Flag stays false after password creation

**Solution:**
```typescript
// After updateUser success
await supabase
  .from('profiles')
  .update({ has_password: true })
  .eq('id', session.user.id);
```

### User Stuck in Onboarding Loop
**Problem:** Profile exists but redirects to onboarding

**Solution:** Check profile query includes error handling for "not found" (PGRST116)

---

## Contact & Support

For issues or questions:
1. Check error logs in browser console
2. Check Supabase logs in Dashboard
3. Verify RLS policies are active
4. Test RPC functions directly in SQL editor

---

**Version:** 1.0.0
**Last Updated:** 2025-01-17
**Status:** ✅ Production Ready
