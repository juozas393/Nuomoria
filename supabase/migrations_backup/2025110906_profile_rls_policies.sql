begin;

-- Ensure row level security is enabled on the users table
alter table public.users enable row level security;

-- Remove existing conflicting policies (if they exist)
drop policy if exists "Users can view own profile" on public.users;
drop policy if exists "Users can insert own profile" on public.users;
drop policy if exists "Users can update own profile" on public.users;

alter table public.communal_meters enable row level security;
drop policy if exists "Users can view communal meters" on public.communal_meters;
drop policy if exists "Users can manage communal meters" on public.communal_meters;

-- Allow authenticated users to read their own profile row
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
create policy "Users can view own profile"
on public.users
for select
using (auth.uid() = id);

-- Allow authenticated users to insert their own profile row
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
create policy "Users can insert own profile"
on public.users
for insert
with check (auth.uid() = id);

-- Allow authenticated users to update their own profile row
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
create policy "Users can update own profile"
on public.users
for update
using (auth.uid() = id)
with check (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view communal meters" ON public.communal_meters;
create policy "Users can view communal meters"
on public.communal_meters
for select
using (
  exists (
    select 1 from public.addresses a
    where a.id = communal_meters.address_id
      and a.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can manage communal meters" ON public.communal_meters;
create policy "Users can manage communal meters"
on public.communal_meters
for all
using (
  exists (
    select 1 from public.addresses a
    where a.id = communal_meters.address_id
      and a.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.addresses a
    where a.id = communal_meters.address_id
      and a.created_by = auth.uid()
  )
);

-- Storage bucket policies for avatars
drop policy if exists "Avatars public read" on storage.objects;
drop policy if exists "Avatars owner insert" on storage.objects;
drop policy if exists "Avatars owner update" on storage.objects;
drop policy if exists "Avatars owner delete" on storage.objects;

-- Allow public read access to avatar images (they are served publicly)
DROP POLICY IF EXISTS "Avatars public read" ON storage.objects;
create policy "Avatars public read"
on storage.objects
for select
using (bucket_id = 'avatars');

-- Allow authenticated users to upload into their own folder (<uid>/...)
DROP POLICY IF EXISTS "Avatars owner insert" ON storage.objects;
create policy "Avatars owner insert"
on storage.objects
for insert
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = split_part(name, '/', 1)
);

-- Allow authenticated users to update objects inside their folder
DROP POLICY IF EXISTS "Avatars owner update" ON storage.objects;
create policy "Avatars owner update"
on storage.objects
for update
using (
  bucket_id = 'avatars'
  and auth.uid()::text = split_part(name, '/', 1)
)
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = split_part(name, '/', 1)
);

-- Allow authenticated users to delete objects inside their folder
DROP POLICY IF EXISTS "Avatars owner delete" ON storage.objects;
create policy "Avatars owner delete"
on storage.objects
for delete
using (
  bucket_id = 'avatars'
  and auth.uid()::text = split_part(name, '/', 1)
);

commit;
