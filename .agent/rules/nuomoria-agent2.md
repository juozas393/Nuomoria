---
trigger: always_on
glob:
description: Nuomoria design systems part 2, DB schema, code conventions, glossary, commands
---

### 7B. Dark Glass Theme — Modal Tabs

```tsx
// SURFACES
const ptSurface     = 'bg-white/[0.08] backdrop-blur-md border border-white/[0.12] rounded-xl overflow-hidden';
const ptSurfaceHero = 'bg-white/[0.10] backdrop-blur-lg border border-white/[0.15] shadow-[0_4px_16px_rgba(0,0,0,0.12)] rounded-xl overflow-hidden';

// TYPOGRAPHY
const ptHeading = 'text-[13px] font-bold text-white';
const ptSub     = 'text-[11px] text-gray-400';
const ptTiny    = 'text-[9px] text-gray-500';
const ptLabel   = 'text-[10px] font-medium text-gray-400 mb-1 block';
const ptValue   = 'text-[13px] font-bold text-white tabular-nums';

// INPUTS
const ptInput  = 'w-full px-3 py-2 bg-white/[0.06] border border-white/[0.10] rounded-lg text-[13px] text-white placeholder-gray-500 focus:ring-1 focus:ring-teal-500/40 transition-all hover:bg-white/[0.08]';
const ptSelect = ptInput + ' appearance-none cursor-pointer';

// ICON CONTAINERS
'w-7 h-7 rounded-lg bg-teal-500/15 flex items-center justify-center'
```

### 7C. Shared Constants

| Token | Value |
|-------|-------|
| Primary accent | `teal-500` / `cyan-400` |
| Success | `emerald-500` / `emerald-400` |
| Error | `red-500` / `red-400` |
| Warning | `amber-500` / `amber-400` |
| Info | `blue-500` / `blue-400` |
| Border radius | `rounded-xl` cards, `rounded-lg` inputs |
| Animation | `transition-all duration-200`, `active:scale-[0.98]` |
| Responsive | Mobile-first, `lg:` for desktop (NEVER `md:`) |
| Typography | `text-[9px]` → `text-[13px]` range |
| Icons | **lucide-react** outline only — NEVER filled emoji |

---

## 8. Database Schema

### Core Tables

```sql
users (id uuid PK, auth_id, email, role CHECK('landlord','tenant','admin'), full_name)
profiles (id → users, username, avatar_url, bio, phone)
addresses (id uuid PK, street, city, zipcode, country, owner_id → users, lat, lng)
properties (id uuid PK, address_id → addresses, unit_number, type, status, rooms, area,
            floor, floors_total, rent, deposit_amount, deposit_paid_amount,
            payment_status, extended_details jsonb)
user_addresses (user_id → users, address_id → addresses, role)
tenants (id uuid PK, property_id → properties, user_id → users,
         monthlyRent, deposit, status, contract_start, contract_end)
tenant_invitations (id, code UNIQUE, address_id, property_id, status, inviter_id, expires_at)
invoices (id uuid PK, property_id, amount, rent_amount, utilities_amount, status, due_date, paid_date)
meters (id uuid PK, property_id, name, type, unit, mode, price_per_unit, distribution_type, is_communal, address_id)
meter_readings (id uuid PK, meter_id → meters, value, reading_date, period, submitted_by)
address_settings (address_id, settings jsonb) -- {late_fee_enabled, late_fee_percent, payment_due_day}
```

### RLS Pattern
```sql
DROP POLICY IF EXISTS "policy_name" ON table;
CREATE POLICY "policy_name" ON table FOR [SELECT|INSERT|UPDATE|DELETE]
  USING (auth.uid() = user_id);

-- Helpers: auth.uid(), app_user_id(), app_user_role(), has_access_to_property(uuid)
```

### Tenant Data Flow & Lookup Patterns

**⚠️ CRITICAL: How tenant assignment works (RLS-safe)**

The tenant lifecycle flows through `tenant_invitations`, NOT through `user_addresses` or a `tenant_user_id` column:

```
1. Landlord creates invitation → tenant_invitations (status='pending', property_id, email)
2. Tenant accepts (joinByCode) → tenant_invitations (status='accepted', email=real_email)
3. DB trigger handle_invitation_accepted → updates properties (tenant_name, status='occupied')
4. DB trigger also creates → user_addresses (user_id, address_id, role_at_address='tenant')
```

**To find a tenant's user_id from landlord context (RLS-safe):**

```tsx
// Step 1: Get accepted invitation (landlord has RLS access to own invitations)
const { data: invitation } = await supabase
    .from('tenant_invitations')
    .select('email, full_name')
    .eq('property_id', propertyId)
    .eq('status', 'accepted')
    .order('responded_at', { ascending: false })
    .limit(1)
    .maybeSingle();

// Step 2: Look up user by email to get user_id
const { data: userRow } = await supabase
    .from('users')
    .select('id')
    .ilike('email', invitation.email)
    .maybeSingle();
// userRow.id = tenant's user_id
```

**Why other approaches FAIL:**
| Approach | Why it fails |
|----------|-------------|
| `properties.tenant_user_id` | Column does NOT exist on staging |
| `user_addresses` direct query | RLS blocks landlord from seeing tenant rows |
| `tenants` table direct query | May not have data OR RLS blocks |
| RPC `get_tenants_at_address` | Must be deployed as SECURITY DEFINER migration |
| `tenant_invitations` → email → `users.id` | **✅ WORKS — landlord owns invitations, users readable** |

---

## 9. Code Conventions

### Language
- Code, comments, variables → **English**
- UI text, labels, buttons, errors → **Lithuanian**
- Lithuanian chars: **ą č ę ė į š ų ū ž** — NEVER ASCII

### Icons & Emoji
- Use **lucide-react** for all icons (outline/stroke style)
- **NEVER** use filled emoji (🏠 ❌ ✅) — use lucide icons instead

### Naming
- Components: PascalCase (`TenantDashboard.tsx`)
- Hooks: camelCase with `use` prefix (`useTenantData.ts`)
- Utils: camelCase (`formatCurrency.ts`)
- Migrations: `YYYYMMDD_description.sql`

### Component Pattern
```tsx
export const Name = memo<Props>(({ prop }) => {
  return ( /* JSX */ );
});
Name.displayName = 'Name';
```

### Form State Machine
```
isDirty=false    → "Nėra pakeitimų"      (disabled)
isDirty=true     → "Išsaugoti pakeitimus" (teal, active)
isSaving=true    → "Saugoma..."           (disabled, spinner)
saveSuccess=true → "Išsaugota!"           (emerald, 2s reset)
error            → "Klaida — bandykite dar kartą" (red)
```

### Formatting
```tsx
// Currency
new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(amount)

// Date
date.toLocaleDateString('lt-LT', { year: 'numeric', month: '2-digit', day: '2-digit' })
```

---

## 10. Lithuanian UI Glossary

| English | Lithuanian |
|---------|-----------|
| Property / Apartment | Būstas / Butas |
| Tenant | Nuomininkas |
| Landlord | Nuomotojas |
| Rent | Nuoma |
| Deposit | Užstatas |
| Contract | Sutartis |
| Meters | Skaitliukai |
| Payment | Mokėjimas |
| Invoice | Sąskaita |
| Vacant | Laisvas |
| Occupied | Išnuomotas |
| Reserved | Rezervuotas |
| Under repair | Remontas |
| Save | Išsaugoti |
| Cancel | Atšaukti |
| Add | Pridėti |
| Delete | Ištrinti |
| Edit | Redaguoti |
| Settings | Nustatymai |
| Overview | Apžvalga |
| Loading | Kraunama... |
| Error | Klaida |
| No data | Nėra duomenų |
| Overdue | Pradelsta |
| Paid | Apmokėta |

---

## 11. Quick Decision Matrix

| Situation | Action |
|-----------|--------|
| New UI in Overview/Dashboard | **Light theme** (surface1/surface2) |
| New UI in TenantDetailModal | **Dark glass** (ptSurface) |
| Need an icon | **lucide-react** |
| Need styling | **TailwindCSS** classes only |
| Need data | Supabase query + `.error` check |
| Complex validation | **Zod** schema |
| New DB column/table | Migration → test Local → push Staging |
| Currency | `Intl.NumberFormat('lt-LT', { currency: 'EUR' })` |
| Date | `date.toLocaleDateString('lt-LT')` |
| User error | Lithuanian: `"Klaida: nepavyko išsaugoti"` |
| New page | `App.tsx` with `React.lazy` + `ErrorBoundary` + `RoleGuard` |
| Long list | `useVirtualization` hook |
| File upload | `useOptimizedUpload` hook |

---

## 12. Development Commands

```bash
cd apps/web && npm run dev    # Dev server → localhost:3000
npm run type-check            # TypeScript verification
npm run build                 # Production build

# Supabase
supabase start                # Start Docker local
supabase db reset             # Reset & rerun all migrations
supabase db push --project-ref isuqgyxrwvvniwvaljrc   # Push to Staging (current target)
# supabase db push --project-ref hlcvskkxrnwxtktscpyy # Production — NOT YET, later
supabase migration new <name> # Create new migration

# Git
git push origin staging       # Current branch — auto-deploys to Vercel
# staging → main merge        # Production deploy — LATER when ready
```

---

*You are NuomoriaDevAgent. Ship fast, ship premium. No shortcuts on quality. Every pixel matters. Currently: Local → Staging. Production when ready.*
