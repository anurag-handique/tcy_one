-- =====================================================================
-- FIX SUPABASE GOTRUE AUTH (Resolves 500 Database Error Querying Schema)
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New query)
-- =====================================================================

-- 1. Ensure extensions exist
create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp";

-- 2. Grant necessary schema permissions to standard Supabase & GoTrue Auth roles
grant usage on schema public to postgres, anon, authenticated, service_role, supabase_auth_admin, authenticator;
grant all on all tables in schema public to postgres, anon, authenticated, service_role, supabase_auth_admin, authenticator;
grant all on all sequences in schema public to postgres, anon, authenticated, service_role, supabase_auth_admin, authenticator;
grant all on all routines in schema public to postgres, anon, authenticated, service_role, supabase_auth_admin, authenticator;

grant usage on schema auth to postgres, supabase_auth_admin, authenticator;
grant all on all tables in schema auth to postgres, supabase_auth_admin;
grant all on all sequences in schema auth to postgres, supabase_auth_admin;
grant all on all routines in schema auth to postgres, supabase_auth_admin;

alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role, supabase_auth_admin, authenticator;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role, supabase_auth_admin, authenticator;
alter default privileges in schema public grant all on routines to postgres, anon, authenticated, service_role, supabase_auth_admin, authenticator;

-- 3. Fix / Update user creation trigger function so it never crashes GoTrue
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
  insert into public.profiles (
    id,
    user_id,
    email,
    full_name,
    role,
    employment_status,
    joining_date,
    work_location,
    created_at,
    updated_at
  )
  values (
    new.id,
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'employee'),
    'active',
    current_date,
    coalesce(new.raw_user_meta_data->>'work_location', 'Office'),
    now(),
    now()
  )
  on conflict (email) do update
  set user_id = new.id,
      updated_at = now();
  return new;
exception when others then
  -- Prevent failing auth transaction if profile creation hits a temporary constraint
  return new;
end;
$$;

-- 4. Re-attach the trigger cleanly
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5. Auto-repair Super Admin user (info@thecodeyogi.com / TCY@2026)
do $$
declare
  admin_uid uuid := 'a0000000-0000-0000-0000-000000000001';
begin
  -- Clear conflicting identities
  delete from auth.identities where user_id = admin_uid or identity_data->>'email' = 'info@thecodeyogi.com';
  delete from auth.users where email = 'info@thecodeyogi.com' or id = admin_uid;

  -- Insert clean user into auth.users with all GoTrue compatible fields
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    admin_uid,
    'authenticated',
    'authenticated',
    'info@thecodeyogi.com',
    extensions.crypt('TCY@2026', extensions.gen_salt('bf')),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"The Code Yogi (Super Admin)","role":"super_admin"}'::jsonb,
    false,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  -- Link identity in auth.identities
  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    gen_random_uuid(),
    admin_uid,
    format('{"sub":"%s","email":"%s"}', admin_uid, 'info@thecodeyogi.com')::jsonb,
    'email',
    admin_uid::text,
    now(),
    now(),
    now()
  );

  -- Ensure public.profiles record exists
  insert into public.profiles (
    id,
    user_id,
    email,
    full_name,
    role,
    employment_status,
    joining_date,
    work_location,
    created_at,
    updated_at
  ) values (
    admin_uid,
    admin_uid,
    'info@thecodeyogi.com',
    'The Code Yogi (Super Admin)',
    'super_admin',
    'active',
    '2026-01-01',
    'Headquarters',
    now(),
    now()
  )
  on conflict (email) do update
  set role = 'super_admin',
      user_id = admin_uid,
      updated_at = now();
end;
$$;

-- 6. Reload Supabase Schema Cache
notify pgrst, 'reload schema';
