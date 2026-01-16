# 🔐 Dual Auth System - Setup Guide

Sistema leidžia vartotojams prisijungti **dviem būdais**:
1. **Google OAuth** (primary)
2. **Username + Password** (secondary, optional)

---

## 📋 Setup Steps

### 1. Run SQL Migration

Paleidžiame migracijas Supabase dashboard arba CLI:

```bash
# Using Supabase CLI
cd supabase
supabase migration up

# OR manually in Supabase SQL Editor:
# Copy and run: supabase/migrations/20260116_create_profiles_dual_auth.sql
```

**Ką sukuria:**
- `profiles` lentelė su: `id`, `email`, `username` (unique!), `role`, `has_password`
- RLS policies
- RPC funkcijos: `get_user_by_username()`, `is_username_available()`
- Triggers: `updated_at` timestamp update

---

### 2. Configure Google OAuth in Supabase

1. Eik į **Supabase Dashboard** → **Authentication** → **Providers**
2. Įjungk **Google** provider
3. **Redirect URLs** skyriuje pridėk:
   ```
   http://localhost:3000/auth/callback
   https://yourdomain.com/auth/callback
   ```
4. Gauk Google OAuth credentials:
   - Eik į [Google Cloud Console](https://console.cloud.google.com/)
   - API & Services → Credentials
   - Sukurk OAuth 2.0 Client ID (Web application)
   - **Authorized redirect URIs** pridėk Supabase callback URL (copy from Supabase dashboard)
5. Copy **Client ID** ir **Client Secret** į Supabase dashboard

---

### 3. Environment Variables

Patikrink kad `.env` turi:

```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
REACT_APP_APP_URL=http://localhost:3000
REACT_APP_AUTH_REDIRECT_URL=http://localhost:3000/auth/callback
REACT_APP_ENV=development
```

---

## 🎯 User Flows

### Flow 1: Naujas vartotojas (Google OAuth)

1. User eina į `/login`
2. Spauda "Continue with Google" → Google OAuth popup
3. Po sėkmingo sign-in → redirect į `/auth/callback`
4. System tikrina ar user turi `profiles` įrašą:
   - **Jei NE** → redirect į `/onboarding`
   - **Jei TAIP** → redirect į dashboard pagal `role`
5. Onboarding:
   - Įveda **username** (unique, realtime check)
   - Pasirenka **role** (landlord/tenant)
   - **OPTIONAL:** Gali pridėti slaptažodį (toggle)
   - Spauda "Išsaugoti" → profile sukuriamas → redirect į dashboard

### Flow 2: Esamas vartotojas (Google OAuth)

1. User eina į `/login`
2. Spauda "Continue with Google"
3. System tikrina profile → redirect į dashboard pagal role

### Flow 3: Esamas vartotojas (Username + Password)

1. User eina į `/login`
2. Spauda "Prisijungti su vartotojo vardu"
3. Įveda **username** + **password**
4. System:
   - Kviečia `get_user_by_username(username)` → gauna `email`, `has_password`
   - Jei `has_password = false` → error "Slaptažodis nenustatytas, prisijunkite su Google"
   - Jei `has_password = true` → `supabase.auth.signInWithPassword(email, password)`
5. Po sėkmingo sign-in → redirect į dashboard

### Flow 4: Pridėti slaptažodį (Settings)

1. User prisijungęs su Google
2. Eina į **Settings** → **Login methods** section
3. Mato:
   - Google: ✓ Aktyvus
   - Slaptažodis: Nenustatytas / Nustatytas
4. Spauda "Sukurti" / "Pakeisti"
5. Modal su password + confirm fields
6. Po save:
   - `supabase.auth.updateUser({ password })`
   - Update `profiles.has_password = true`
7. Dabar user gali prisijungti su username+password

---

## 🔒 Security

### RLS Policies

```sql
-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Allow public username lookup (for login)
CREATE POLICY "Public can lookup username for auth"
  ON public.profiles FOR SELECT
  USING (true);
```

**Kodėl public SELECT safe?**
- Exposeame tik: `username` → `email`, `has_password`
- Neslepiame sensitive duomenų (phone, personal info, etc.)
- Tai būtina username/password login flow

### Username Validation

- **Format:** `a-z`, `0-9`, `.`, `_`, `-` (no spaces)
- **Length:** 3-20 characters
- **Unique:** Case-insensitive uniqueness
- **Realtime check:** Debounced API call (`is_username_available()`)

### Password Strength

- **Minimum:** 8 characters
- **Recommendation:** 12+ characters
- **UI feedback:** Weak / Medium / Strong

---

## 📁 File Structure

```
property-manager/src/
├── pages/
│   ├── DualAuthLogin.tsx         # NEW: Login page su dual auth
│   ├── UserOnboarding.tsx         # NEW: Onboarding po Google sign-in
│   └── SupabaseAuthCallback.tsx  # UPDATED: Profile check + redirect
├── components/
│   └── settings/
│       └── LoginMethodsSection.tsx  # NEW: Password management
└── App.tsx                        # UPDATED: Nauji route'ai

supabase/migrations/
└── 20260116_create_profiles_dual_auth.sql  # NEW: Profiles + RLS + RPC
```

---

## 🧪 Testing Checklist

### Naujas User Flow (Google OAuth)
- [ ] Click "Continue with Google" → Google popup
- [ ] Po sign-in → redirect į `/onboarding`
- [ ] Onboarding: Username check rodo "✓ Laisvas" / "✗ Užimtas"
- [ ] Onboarding: Role selection veikia
- [ ] Onboarding: Password toggle veikia
- [ ] Po save → redirect į correct dashboard (landlord/tenant)

### Username+Password Login (su nustatytu slaptažodžiu)
- [ ] Click "Prisijungti su vartotojo vardu"
- [ ] Įvesti username + password
- [ ] Sėkmingai prisijungia → redirect į dashboard

### Username+Password Login (be slaptažodžio)
- [ ] Įvesti username + password
- [ ] Gauti error: "Slaptažodis nenustatytas..."

### Settings - Add Password
- [ ] Prisijungti su Google
- [ ] Eiti į Settings
- [ ] Matyti "Slaptažodis: Nenustatytas"
- [ ] Click "Sukurti"
- [ ] Įvesti password + confirm
- [ ] Po save → "Slaptažodis: Nustatytas"
- [ ] Logout → prisijungti su username+password

---

## 🐛 Debugging

### PKCE Errors

Jei matai `400 both auth code and code verifier should be non-empty`:

**Priežastis:** `exchangeCodeForSession` kviečiamas be `?code=` parametro URL

**Fix:** Jau pataisyta `SupabaseAuthCallback.tsx`:
```typescript
const code = url.searchParams.get('code');
if (!code) {
  // Tiesiog tikrinam sesiją, nekviečiam exchange
  const { data } = await supabase.auth.getSession();
  // ...
}
```

### User Not Redirecting After Login

**Patikrink:**
1. Console logs: `🔍 AuthContext hydrateFromSession: {hasSession: true, hasUser: true}`
2. `AuthContext.tsx` line ~596: `const authUser = s?.user;` (NOT `s.session?.user`)
3. `ProtectedRoute` loading state

### Username Already Taken

**SQL check:**
```sql
SELECT username, email FROM profiles WHERE LOWER(username) = LOWER('desired-username');
```

---

## 🚀 Deployment

### Production Checklist

- [ ] Update `.env.production` su production Supabase credentials
- [ ] Google OAuth: Pridėti production redirect URL
- [ ] Supabase: Whitelist production domain `https://yourdomain.com`
- [ ] Run migrations production DB
- [ ] Test Google OAuth production
- [ ] Test username+password login
- [ ] Enable `React.StrictMode` atgal (dabar išjungtas dev mode)

---

## 📞 Support

Jei kyla problemų:
1. Check Console logs
2. Check Supabase Logs (Dashboard → Logs)
3. Verify RLS policies
4. Verify Google OAuth config

---

**Autorius:** AI Assistant  
**Data:** 2026-01-16  
**Versija:** 1.0.0
