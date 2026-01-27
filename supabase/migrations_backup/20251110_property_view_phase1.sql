-- Property View Phase 1 support tables
set check_function_bodies = off;

-- Invoice payments table stores partial/complete payments for invoices
create table if not exists public.invoice_payments (
    id uuid primary key default gen_random_uuid(),
    invoice_id uuid not null references public.invoices(id) on delete cascade,
    amount numeric(12,2) not null check (amount >= 0),
    payment_method text check (payment_method in ('cash','bank_transfer','card','check','other')),
    paid_at date not null default timezone('utc'::text, now())::date,
    notes text,
    created_by uuid references auth.users(id),
    created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists invoice_payments_invoice_idx
    on public.invoice_payments (invoice_id);

create index if not exists invoice_payments_paid_at_idx
    on public.invoice_payments (paid_at desc);

alter table public.invoice_payments enable row level security;

create policy if not exists "Invoice payments manage own"
    on public.invoice_payments
    for all
    using (auth.uid() = created_by)
    with check (auth.uid() = created_by);

create policy if not exists "Invoice payments view own"
    on public.invoice_payments
    for select
    using (auth.uid() = created_by);

-- Deposit events table keeps running ledger for property deposits
create table if not exists public.property_deposit_events (
    id uuid primary key default gen_random_uuid(),
    property_id uuid not null references public.properties(id) on delete cascade,
    event_type text not null check (event_type in ('received','adjustment','refund')),
    amount numeric(12,2) not null,
    balance_after numeric(12,2),
    notes text,
    created_by uuid references auth.users(id),
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists property_deposit_events_property_idx
    on public.property_deposit_events (property_id, created_at desc);

alter table public.property_deposit_events enable row level security;

create policy if not exists "Deposit events manage own"
    on public.property_deposit_events
    for all
    using (auth.uid() = created_by)
    with check (auth.uid() = created_by);

create policy if not exists "Deposit events view own"
    on public.property_deposit_events
    for select
    using (auth.uid() = created_by);




