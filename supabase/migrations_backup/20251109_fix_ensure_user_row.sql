-- Copy the entire contents of this file into Supabase SQL Editor (project > SQL Editor) and run it.
-- It redefines ensure_user_row so duplicate emails map to the current auth.uid.
begin;

set search_path to public;

drop function if exists public.ensure_user_row(text, text, text);

create or replace function public.ensure_user_row(
  p_role text default 'tenant',
  p_first_name text default 'User',
  p_last_name text default 'Name'
)
returns void
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_existing_id uuid;
begin
  if v_user_id is null then
    raise notice 'ensure_user_row: auth.uid() returned null';
    return;
  end if;

  select email into v_email
  from auth.users
  where id = v_user_id;

  if v_email is null then
    raise notice 'ensure_user_row: auth user % has no email', v_user_id;
    return;
  end if;

  select id into v_existing_id
  from public.users
  where email = v_email
  limit 1;

  if v_existing_id is null then
    insert into public.users (
      id,
      email,
      role,
      google_linked,
      google_email,
      first_name,
      last_name,
      created_at,
      updated_at
    )
    values (
      v_user_id,
      v_email,
      coalesce(p_role, 'tenant'),
      true,
      v_email,
      coalesce(nullif(p_first_name, ''), 'User'),
      coalesce(nullif(p_last_name, ''), 'Name'),
      now(),
      now()
    )
    on conflict (id) do update set
      email = excluded.email,
      role = excluded.role,
      google_linked = excluded.google_linked,
      google_email = excluded.google_email,
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      updated_at = now();
  elsif v_existing_id <> v_user_id then
    update public.users
    set
      id = v_user_id,
      role = coalesce(p_role, role),
      google_linked = true,
      google_email = coalesce(google_email, v_email),
      first_name = coalesce(nullif(first_name, ''), p_first_name, 'User'),
      last_name = coalesce(nullif(last_name, ''), p_last_name, 'Name'),
      updated_at = now()
    where email = v_email;
  else
    update public.users
    set
      role = coalesce(p_role, role),
      google_linked = true,
      google_email = coalesce(google_email, v_email),
      first_name = coalesce(nullif(first_name, ''), p_first_name, 'User'),
      last_name = coalesce(nullif(last_name, ''), p_last_name, 'Name'),
      updated_at = now()
    where id = v_user_id;
  end if;
end;
$$;

commit;
