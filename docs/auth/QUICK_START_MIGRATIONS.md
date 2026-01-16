# 🚀 Quick Start - Setup Migrations (5 min)

## ✅ Step 1: Install Supabase CLI

**Pasirink vieną:**

### Option A: Scoop (Recommended for Windows)

```powershell
# Install Scoop (if not installed)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression

# Install Supabase CLI
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Option B: npm

```powershell
npm install -g supabase
```

### Verify:

```powershell
supabase --version
# Should output: supabase 1.x.x
```

---

## ✅ Step 2: Login to Supabase

```powershell
supabase login
```

Tai atidarys naršyklę - prisijunk su savo Supabase account.

---

## ✅ Step 3: Link Project

```powershell
# Navigate to project
cd "C:\Users\juoza\Desktop\Tvarkingi Darbai\PropertyManagmentv2"

# Link to remote project
supabase link --project-ref hlcvskkxrnwxtktscpyy
```

**Paprašys DB password:**
- Eik į: https://supabase.com/dashboard/project/hlcvskkxrnwxtktscpyy/settings/database
- Copy **Database Password** (arba reset if forgotten)
- Paste į terminal

---

## ✅ Step 4: Push Migrations

```powershell
# Deploy migrations to remote DB
supabase db push
```

Turėtum pamatyti:

```
Applying migration 20260116_create_profiles_dual_auth.sql...
Migration applied successfully!
```

---

## ✅ Step 5: Verify

```powershell
# Check migration status
supabase migration list

# Should show:
# ✅ 20260116_create_profiles_dual_auth.sql (applied)
```

**ARBA** patikrink Supabase Dashboard:
- Table Editor → turėtum matyti `profiles` table

---

## 🎉 DONE!

Dabar gali:

1. **Create new migrations:**
   ```powershell
   supabase migration new add_feature_name
   # Edit: supabase/migrations/YYYYMMDD_add_feature_name.sql
   supabase db push
   ```

2. **Commit to Git:**
   ```bash
   git add supabase/migrations/
   git commit -m "feat: add profiles table for dual auth"
   ```

3. **Team collaboration:**
   - Team members run: `supabase db pull`
   - Gets latest schema changes

---

## 🐛 Troubleshooting

### "supabase: command not found"

**Fix:**
```powershell
# Restart PowerShell after installation
# OR check PATH:
$env:PATH
# Should include Scoop path: C:\Users\YourName\scoop\shims
```

### "Project not linked"

**Fix:**
```powershell
supabase link --project-ref hlcvskkxrnwxtktscpyy
```

### "Database password incorrect"

**Fix:**
1. Go to: https://supabase.com/dashboard/project/hlcvskkxrnwxtktscpyy/settings/database
2. Click **Reset Database Password**
3. Copy new password
4. Re-run: `supabase link --project-ref hlcvskkxrnwxtktscpyy`

---

## 📚 Next Steps

Read full guide: `SUPABASE_MIGRATIONS_GUIDE.md`

Setup dual auth: `DUAL_AUTH_SETUP.md`

---

**Time: ~5 minutes** ⏱️  
**Difficulty: Easy** ✅
