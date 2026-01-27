# 🛠️ Nuomoria - Development Guide

## 📋 Quick Reference

| Environment | Command | URL | Supabase |
|-------------|---------|-----|----------|
| **Development** | `npm run dev` | localhost:5173 | Production DB |
| **Docker** | `npm run dev:docker` | localhost:5173 | Docker localhost:54321 |
| **Production** | Vercel auto-deploy | nuomoria.com | Production DB |

---

## 🌳 Git Branching Strategy

```
main        → Production (Vercel auto-deploys nuomoria.com)
  ↑
staging     → Pre-production (Vercel Preview, testas su production DB)
  ↑
develop     → Docker testavimas (lokaliai su Docker Supabase)
  ↑
feature/*   → Naujos funkcijos
```

### Branch'ų paskirtis

| Branch | Aplinka | Supabase | Deploy |
|--------|---------|----------|--------|
| `feature/*` | Lokalus dev | Docker arba Prod | - |
| `develop` | Docker testavimas | localhost:54321 | - |
| `staging` | Vercel Preview | Production DB | Auto → preview URL |
| `main` | Production | Production DB | Auto → nuomoria.com |

### Workflow

```bash
# 1. Sukurti feature branch
git checkout develop
git checkout -b feature/my-new-feature

# 2. Dirbti ir testuoti su Docker
npm run dev:docker

# 3. Kai veikia - merge į develop
git checkout develop
git merge feature/my-new-feature

# 4. Testuoti Docker'yje finaliai
npm run dev:docker
# Patikrinti ar viskas veikia

# 5. Merge į staging (Vercel Preview)
git checkout staging
git merge develop
git push
# Vercel sukurs preview URL - testuoti su production DB

# 6. Kai staging veikia - merge į main (Production)
git checkout main
git merge staging
git push
# Vercel deploy'ins į nuomoria.com
```

### Kada ką naudoti

| Situacija | Branch | Komanda |
|-----------|--------|---------|
| Naujas feature | `feature/*` | `npm run dev:docker` |
| Testavimas prieš preview | `develop` | `npm run dev:docker` |
| Testavimas su real data | `staging` | Vercel preview URL |
| Production release | `main` | Vercel auto-deploy |

---

## 🗂️ Environment Files

Located in `apps/web/`:

| File | Purpose | Git | When Used |
|------|---------|-----|-----------|
| `.env.development` | Dev defaults (Production Supabase) | ✅ committed | `npm run dev` |
| `.env.production` | Production URLs | ✅ committed | Vercel builds |
| `.env.docker` | Docker Supabase (localhost) | ❌ gitignored | `npm run dev:docker` |
| `.env.local` | Local overrides | ❌ gitignored | Optional |

### Environment Variables

```env
# Supabase Connection
VITE_SUPABASE_URL=https://xxx.supabase.co  # or http://localhost:54321 for Docker
VITE_SUPABASE_ANON_KEY=xxx

# App Configuration
VITE_APP_URL=http://localhost:5173
VITE_APP_NAME=Nuomoria
```

---

## 🐳 Docker Local Development

### Prerequisites
- Docker Desktop running
- Supabase CLI installed (`npm install -g supabase`)

### Start Local Supabase
```bash
# In project root
supabase start

# This starts:
# - PostgreSQL: localhost:54322
# - API: localhost:54321
# - Studio: localhost:54323
# - Inbucket (emails): localhost:54324
```

### Run App with Docker Supabase
```bash
cd apps/web
npm run dev:docker
```

### Access Local Services
- **App**: http://localhost:5173
- **Supabase Studio**: http://localhost:54323
- **Email testing**: http://localhost:54324

### ⚠️ Docker Limitations
- **Google OAuth WILL NOT WORK** - use email/password or magic link
- Database is separate from production
- Need to run migrations manually

---

## 🗃️ Database Migrations

### Migration Files Location
```
supabase/migrations/
├── 20260121_docker_schema_fix.sql     # Schema sync for Docker
├── 20260121_handle_new_user_trigger.sql # Auth triggers
├── 20260121_storage_bucket.sql        # Storage bucket setup
└── 20260121_property_photos_optimization.sql # Photos table
```

### Apply Migrations

**Docker (local):**
```bash
# Via Supabase Studio SQL Editor (localhost:54323)
# Or via CLI:
supabase db push
```

**Production:**
```bash
# Run in Supabase Dashboard SQL Editor
# Or link and push:
supabase link --project-ref hlcvskkxrnwxtktscpyy
supabase db push
```

### Creating New Migrations
```bash
# Generate timestamped migration file
supabase migration new your_migration_name

# Or manually create:
# supabase/migrations/YYYYMMDD_description.sql
```

### Migration Best Practices
- Use `IF NOT EXISTS` for tables
- Use `DROP POLICY IF EXISTS` before `CREATE POLICY`
- Include rollback comments
- Test on Docker first, then production

---

## 📦 Storage Buckets

### Current Buckets
| Bucket | Purpose | Public |
|--------|---------|--------|
| `avatars` | User profile pictures | Yes |
| `property-photos` | Property images | Yes |

### Create Bucket via SQL
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('bucket-name', 'bucket-name', true)
ON CONFLICT (id) DO NOTHING;
```

---

## 🔐 Authentication System

### Auth Flow
1. User clicks "Login with Google"
2. Supabase Auth handles OAuth
3. `handle_new_user` trigger creates user row
4. App reads role from `users` table
5. Redirects based on role: landlord → `/` | tenant → `/tenant/dashboard`

### Role Assignment
- New users have `role = NULL` → sent to `/onboarding`
- After onboarding, role is set to `landlord` or `tenant`

### Triggers
```sql
-- handle_new_user runs on auth.users INSERT
-- Creates row in public.users and profiles
```

---

## 🚀 Deployment

### Vercel (Production)
- Auto-deploys from `main` branch
- Uses `.env.production` values
- Environment variables set in Vercel dashboard

### Manual Build
```bash
cd apps/web
npm run build
npm run preview
```

---

## 📁 Project Structure

```
PropertyManagmentv2/
├── apps/
│   └── web/                      # Main React app
│       ├── src/
│       │   ├── components/       # UI components
│       │   ├── context/          # React context (AuthContext)
│       │   ├── features/         # Feature modules (auth, tenant, landlord)
│       │   ├── hooks/            # Custom React hooks
│       │   ├── lib/              # Supabase client, APIs
│       │   ├── pages/            # Route pages
│       │   ├── types/            # TypeScript types
│       │   └── utils/            # Utility functions
│       ├── .env.development      # Dev environment
│       ├── .env.production       # Prod environment
│       └── .env.docker           # Docker environment
├── supabase/
│   └── migrations/               # SQL migrations
├── .agent/
│   └── workflows/                # Agent workflows
├── .gitignore
├── README.md                     # Public readme
└── DEVELOPMENT.md                # This file
```

---

## 🐛 Troubleshooting

### "Bucket not found" error
Run the storage bucket migration in Supabase SQL Editor.

### Photos not displaying
1. Check if bucket is public (Storage → bucket → Settings)
2. Verify RLS policies exist for storage.objects

### User stuck on wrong dashboard
1. Check `users.role` in database
2. Clear localStorage
3. Force refresh (`window.location.href = '/'`)

### 406 Error on queries
Change `.single()` to `.maybeSingle()` in Supabase queries.

---

## 📝 Useful Commands

```bash
# Development
npm run dev                 # Start with production Supabase
npm run dev:docker          # Start with local Docker Supabase

# Build
npm run build               # Production build
npm run preview             # Preview production build

# Type checking
npm run type-check          # TypeScript check

# Supabase
supabase start              # Start local Supabase
supabase stop               # Stop local Supabase
supabase status             # Show local Supabase URLs
supabase db diff            # Show schema differences
supabase db push            # Apply migrations
```

---

**Last updated:** 2024-01-21
