# ✅ Setup Checklist - Dual Auth System

## 📚 Documentation

| File | Purpose |
|------|---------|
| `QUICK_START_MIGRATIONS.md` | **START HERE** - 5 min setup |
| `SUPABASE_MIGRATIONS_GUIDE.md` | Full migrations guide |
| `DUAL_AUTH_SETUP.md` | Auth system documentation |
| `INSTALL_SUPABASE_CLI.md` | CLI installation details |

---

## 🎯 Setup Steps (30 min total)

### Phase 1: Database Setup (10 min)

- [ ] **1.1** Install Supabase CLI
  ```powershell
  scoop install supabase
  # OR
  npm install -g supabase
  ```

- [ ] **1.2** Login to Supabase
  ```powershell
  supabase login
  ```

- [ ] **1.3** Link project
  ```powershell
  cd "C:\Users\juoza\Desktop\Tvarkingi Darbai\PropertyManagmentv2"
  supabase link --project-ref hlcvskkxrnwxtktscpyy
  ```

- [ ] **1.4** Push migrations
  ```powershell
  supabase db push
  ```

- [ ] **1.5** Verify
  - Check: https://supabase.com/dashboard/project/hlcvskkxrnwxtktscpyy/editor
  - Should see `profiles` table

---

### Phase 2: Google OAuth Setup (10 min)

- [ ] **2.1** Get Google OAuth Credentials
  - Go to: https://console.cloud.google.com/
  - APIs & Services → Credentials
  - Create OAuth 2.0 Client ID (Web application)
  - Authorized redirect URIs: 
    ```
    https://hlcvskkxrnwxtktscpyy.supabase.co/auth/v1/callback
    ```
  - Copy **Client ID** and **Client Secret**

- [ ] **2.2** Configure Supabase
  - Go to: https://supabase.com/dashboard/project/hlcvskkxrnwxtktscpyy/auth/providers
  - Enable **Google** provider
  - Paste **Client ID** and **Client Secret**
  - Save

- [ ] **2.3** Add Redirect URLs
  - Still in Supabase → Authentication → URL Configuration
  - Add to **Redirect URLs**:
    ```
    http://localhost:3000/auth/callback
    https://yourdomain.com/auth/callback (for production)
    ```
  - Save

---

### Phase 3: Frontend Setup (5 min)

- [ ] **3.1** Clear browser cache
  ```javascript
  // In browser console:
  localStorage.clear()
  sessionStorage.clear()
  ```

- [ ] **3.2** Hard refresh
  ```
  Ctrl+Shift+R
  ```

- [ ] **3.3** Restart dev server (if running)
  ```powershell
  # Stop: Ctrl+C
  cd property-manager
  npm start
  ```

---

### Phase 4: Testing (5 min)

- [ ] **4.1** Test Google OAuth (new user)
  - Go to: http://localhost:3000/login
  - Click "Continue with Google"
  - Should redirect to `/onboarding`
  - Fill: username + role + (optional) password
  - Should redirect to dashboard

- [ ] **4.2** Test Google OAuth (existing user)
  - Logout
  - Login with Google again
  - Should go directly to dashboard

- [ ] **4.3** Test Username+Password (if set)
  - Logout
  - Click "Prisijungti su vartotojo vardu"
  - Enter username + password
  - Should login successfully

- [ ] **4.4** Test Settings - Add Password
  - Login with Google
  - Go to Settings
  - Find "Login methods" section
  - Click "Sukurti slaptažodį"
  - Set password
  - Logout → Login with username+password

---

## 🎉 Success Criteria

### ✅ Database
- `profiles` table exists
- RPC functions work: `get_user_by_username()`, `is_username_available()`
- RLS policies active

### ✅ Authentication
- Google OAuth works
- New users redirected to onboarding
- Existing users redirected to dashboard
- Username+password login works (if password set)

### ✅ Onboarding
- Username availability check works (realtime)
- Role selection works
- Optional password toggle works
- Profile creation successful

### ✅ Settings
- Can add password
- Can change password
- `has_password` flag updates correctly

---

## 🐛 Common Issues

### Issue: "supabase: command not found"
**Fix:** Restart PowerShell after installation

### Issue: "Migration already applied"
**Fix:** 
```powershell
supabase migration list
# If shows as applied, you're good!
```

### Issue: "User redirects to login after OAuth"
**Fix:** Check console logs:
```
Should see: 🔍 AuthContext hydrateFromSession: {hasSession: true, hasUser: true}
```

### Issue: "Username taken but I just created it"
**Fix:** Check profiles table:
```sql
SELECT * FROM profiles WHERE LOWER(username) = LOWER('your-username');
```

---

## 📊 Migration Status Check

```powershell
# Check local migrations
ls supabase/migrations/

# Check remote status
supabase migration list

# Should show:
# ✅ 20260116_create_profiles_dual_auth.sql (applied)
```

---

## 🚀 Next Features (Future)

Ideas for extending the system:

- [ ] Email/Password auth (separate from username/password)
- [ ] 2FA (TOTP)
- [ ] Passkeys (WebAuthn)
- [ ] Social login (GitHub, Facebook)
- [ ] Password reset flow
- [ ] Email verification
- [ ] Account linking (merge accounts)

---

## 📞 Need Help?

1. Check console logs (F12)
2. Check Supabase logs (Dashboard → Logs)
3. Review documentation files
4. Check migration status: `supabase migration list`

---

**Setup Time:** ~30 minutes  
**Difficulty:** Medium  
**Status:** Ready for testing! 🎯
