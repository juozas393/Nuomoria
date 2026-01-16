# Installing Supabase CLI on Windows

## Option 1: Using Scoop (Recommended)

```powershell
# 1. Install Scoop (if not already installed)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression

# 2. Install Supabase CLI
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

## Option 2: Using npm

```powershell
npm install -g supabase
```

## Verify Installation

```powershell
supabase --version
# Should output: supabase 1.x.x
```

## Usage

```powershell
# Login
supabase login

# Run migrations
cd C:\Users\juoza\Desktop\Tvarkingi Darbai\PropertyManagmentv2
supabase migration up
```

---

**BUT FOR NOW:** Just use Supabase Dashboard SQL Editor! ✅
