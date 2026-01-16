-- Table for tenant invitations
set check_function_bodies = off;

create table if not exists public.tenant_invitations (
    id uuid primary key default gen_random_uuid(),
    property_id uuid not null references public.properties(id) on delete cascade,
    email text not null,
    full_name text,
    phone text,
    contract_start date,
    contract_end date,
    rent numeric(12,2),
    deposit numeric(12,2),
    status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
    token uuid not null default gen_random_uuid(),
    invited_by uuid references auth.users(id),
    invited_by_email text,
    property_label text,
    created_at timestamptz not null default timezone('utc'::text, now()),
    responded_at timestamptz
);

create index if not exists tenant_invitations_email_idx
    on public.tenant_invitations (lower(email));

create index if not exists tenant_invitations_property_idx
    on public.tenant_invitations (property_id);

alter table public.tenant_invitations enable row level security;

drop policy if exists "Tenant invitations inviter manage" on public.tenant_invitations;
drop policy if exists "Tenant invitations tenant view" on public.tenant_invitations;
drop policy if exists "Tenant invitations tenant respond" on public.tenant_invitations;

create policy "Tenant invitations inviter manage"
    on public.tenant_invitations
    for all
    using (auth.uid() = invited_by)
    with check (auth.uid() = invited_by);

create policy "Tenant invitations tenant view"
    on public.tenant_invitations
    for select
    using (lower(email) = lower(coalesce(auth.jwt()->>'email', '')));

create policy "Tenant invitations tenant respond"
    on public.tenant_invitations
    for update
    using (
        status = 'pending'
        and lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
    )
    with check (lower(email) = lower(coalesce(auth.jwt()->>'email', '')));





