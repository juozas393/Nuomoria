# 🗄️ Supabase Migrations - Professional Setup Guide

Migrations leidžia:
- ✅ **Version control** DB schema (Git)
- ✅ **Safe deployments** (rollback jei reikia)
- ✅ **Team collaboration** (visi turi tą pačią DB schema)
- ✅ **Local development** → Production deployment
- ✅ **Audit trail** (kas, kada, ką pakeitė)

---

## 📦 1. Install Supabase CLI

### Windows (PowerShell):

```powershell
# Option 1: Scoop (Recommended)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression

scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Option 2: npm (alternative)
npm install -g supabase

# Verify installation
supabase --version
```

---

## 🔗 2. Link Your Supabase Project

```powershell
# Navigate to project root
cd "C:\Users\juoza\Desktop\Tvarkingi Darbai\PropertyManagmentv2"

# Login to Supabase
supabase login

# Link to your remote project
supabase link --project-ref hlcvskkxrnwxtktscpyy

# You'll be prompted for your database password
# (This is the password you set when creating the project)
```

**Kaip gauti DB password?**
- Supabase Dashboard → Settings → Database → **Database Password**
- Jei pamiršai: **Reset Database Password** (ACHTUNG: tai resetins visus DB connections!)

---

## 📝 3. Migration Workflow

### Create New Migration

```powershell
# Generate new migration file
supabase migration new your_migration_name

# Example:
supabase migration new add_user_preferences
# Creates: supabase/migrations/20260116_add_user_preferences.sql
```

### Write SQL in Migration File

```sql
-- supabase/migrations/20260116_add_user_preferences.sql

-- Add new column
ALTER TABLE profiles ADD COLUMN preferences jsonb DEFAULT '{}';

-- Create index
CREATE INDEX profiles_preferences_idx ON profiles USING gin(preferences);
```

### Apply Migrations Locally (if using local Supabase)

```powershell
# Start local Supabase (Docker required)
supabase start

# Apply migrations to local DB
supabase db reset
```

### Apply Migrations to Remote (Production)

```powershell
# Push migrations to remote project
supabase db push

# Verify migrations applied
supabase migration list
```

---

## 🔄 4. Your Current Setup

Jūs jau turite migration failą:
```
supabase/migrations/20260116_create_profiles_dual_auth.sql
```

**Kad jį pritaikytum remote DB:**

```powershell
# 1. Ensure CLI is installed and logged in
supabase login

# 2. Link project
supabase link --project-ref hlcvskkxrnwxtktscpyy

# 3. Push migrations
supabase db push
```

Tai pritaikys **visas** migraciją failą iš `supabase/migrations/` folder į remote DB.

---

## 📊 5. Migration Management Commands

```powershell
# List all migrations (local + remote)
supabase migration list

# View migration status
supabase db diff

# Create new migration from schema changes
supabase db diff --schema public > supabase/migrations/new_changes.sql

# Rollback last migration (CAUTION!)
supabase db reset

# Pull schema from remote (to sync with team)
supabase db pull
```

---

## 🔐 6. Security & Best Practices

### ✅ DO:

- **Version control migrations** (commit to Git)
  ```bash
  git add supabase/migrations/
  git commit -m "feat: add profiles table for dual auth"
  ```

- **Name migrations descriptively:**
  ```
  ✅ 20260116_create_profiles_dual_auth.sql
  ✅ 20260117_add_user_preferences.sql
  ❌ 20260116_migration.sql
  ```

- **Test migrations locally first** (if possible)
  ```powershell
  supabase start  # Local Supabase
  supabase db reset  # Apply migrations
  # Test your app locally
  supabase db push  # Push to remote when ready
  ```

- **Review migration before push:**
  ```powershell
  # See what will be applied
  supabase db diff
  ```

### ❌ DON'T:

- **Don't modify old migrations** (create new one instead)
- **Don't commit sensitive data** (passwords, API keys) in migrations
- **Don't skip migrations** (always run in order)
- **Don't push to production without testing**

---

## 🎯 7. Your Next Steps

### Option A: Quick Setup (Right Now)

```powershell
# 1. Install CLI
scoop install supabase
# OR
npm install -g supabase

# 2. Login
supabase login

# 3. Link project
cd "C:\Users\juoza\Desktop\Tvarkingi Darbai\PropertyManagmentv2"
supabase link --project-ref hlcvskkxrnwxtktscpyy

# 4. Push migrations
supabase db push
```

### Option B: Manual (For Now)

Jei CLI setup užtrunka, gali:
1. Copy-paste SQL į Supabase Dashboard (kaip minėjau)
2. Setup CLI vėliau
3. Naudoti `supabase db pull` gauti current schema → syncinui

---

## 📁 8. Project Structure (Best Practice)

```
PropertyManagmentv2/
├── supabase/
│   ├── config.toml                    # Supabase project config
│   ├── migrations/
│   │   ├── 20260116_create_profiles_dual_auth.sql
│   │   ├── 20260117_add_user_preferences.sql
│   │   └── 20260118_create_notifications.sql
│   ├── seed.sql                       # Test data (optional)
│   └── functions/                     # Edge Functions (if needed)
├── property-manager/
│   └── src/
└── .env                               # DB passwords (gitignored!)
```

---

## 🚀 9. Git Workflow

```bash
# 1. Create migration
supabase migration new feature_name

# 2. Write SQL
# Edit: supabase/migrations/20260116_feature_name.sql

# 3. Test locally (if using local Supabase)
supabase db reset

# 4. Commit to Git
git add supabase/migrations/20260116_feature_name.sql
git commit -m "feat: add feature_name migration"

# 5. Push to remote branch
git push origin feature/dual-auth

# 6. After PR merge → Deploy to production
supabase db push
```

---

## 🐛 10. Troubleshooting

### Error: "Project not linked"

```powershell
supabase link --project-ref hlcvskkxrnwxtktscpyy
```

### Error: "Migration already applied"

```powershell
# Check migration status
supabase migration list

# If needed, manually mark as applied
supabase migration repair
```

### Error: "Database password incorrect"

```powershell
# Get password from Dashboard:
# Settings → Database → Connection String → Password

# Re-link with correct password
supabase link --project-ref hlcvskkxrnwxtktscpyy
```

### Rollback Migration (CAUTION!)

```powershell
# Local only
supabase db reset

# Remote: Manual via Dashboard SQL Editor
# Run reverse SQL (e.g., DROP TABLE, ALTER TABLE DROP COLUMN)
```

---

## 📚 11. Resources

- **Supabase CLI Docs:** https://supabase.com/docs/guides/cli
- **Migrations Guide:** https://supabase.com/docs/guides/cli/local-development
- **CLI Reference:** https://supabase.com/docs/reference/cli/introduction

---

## ✅ TL;DR - Quick Commands

```powershell
# Install
scoop install supabase

# Setup
supabase login
cd "C:\Users\juoza\Desktop\Tvarkingi Darbai\PropertyManagmentv2"
supabase link --project-ref hlcvskkxrnwxtktscpyy

# Deploy migrations
supabase db push

# Create new migration
supabase migration new migration_name

# Check status
supabase migration list
```

---

**Autorius:** AI Assistant  
**Data:** 2026-01-16  
**Versija:** 1.0.0
