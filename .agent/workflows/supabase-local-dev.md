---
description: Supabase local development with Docker
---

# Supabase Local Development Workflow

## Initial Setup (One-time)

1. Install Docker Desktop
2. Install Supabase CLI: `npm install -g supabase`
3. Initialize project: `supabase init` (creates supabase/ folder)
4. Link to production: `supabase link --project-ref <project-id>`

## Daily Development

// turbo
1. Start local Supabase: `supabase start`
   - This starts Docker containers with local Postgres, Auth, Storage, etc.
   - Studio available at http://127.0.0.1:54323
   - API at http://127.0.0.1:54321

2. Create migrations for DB changes:
   ```bash
   supabase migration new <migration_name>
   ```
   - Edit the generated file in `supabase/migrations/`

// turbo
3. Test migrations locally:
   ```bash
   supabase db reset  # Resets local DB and runs all migrations
   ```

// turbo
4. Stop when done:
   ```bash
   supabase stop
   ```

## Push to Production

### Option A: Supabase CLI
```bash
supabase db push --linked
```

### Option B: GitHub Actions (recommended for CI/CD)
- Configure GitHub Action to run `supabase db push` on merge to main

## Key Commands

| Command | Description |
|---------|-------------|
| `supabase start` | Start local dev environment |
| `supabase stop` | Stop local containers |
| `supabase status` | Check local service status |
| `supabase db reset` | Reset local DB, rerun migrations |
| `supabase db push` | Push migrations to production |
| `supabase db pull` | Pull schema from production |
| `supabase migration new <name>` | Create new migration |
| `supabase migration list` | List migration status |

## Environment Files

- `.env.local` - Current active environment
- `.env.local.docker` - Local Docker config (VITE_SUPABASE_URL=http://127.0.0.1:54321)
- `.env.local.staging` - Staging config
- `.env.local.production` - Production config

## Notes

- Google OAuth does NOT work with local Supabase (needs real callback URLs)
- For OAuth testing, use Staging environment
- Local DB is empty by default - create test data as needed
