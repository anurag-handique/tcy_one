-- =====================================================================
-- FIX SUPABASE GOTRUE AUTH (Resolves 500 Database Error Querying Schema)
-- Run this in your Supabase SQL Editor
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

do $$
declare
  admin_uid uuid := 'a0000000-0000-0000-0000-000000000001';
begin
  -- 1. Remove previous partial auth entries if any
  delete from auth.identities where user_id = admin_uid or identity_data->>'email' = 'info@thecodeyogi.com';
  delete from auth.users where email = 'info@thecodeyogi.com' or id = admin_uid;

  -- 2. Insert clean user into auth.users
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
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
    null,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"The Code Yogi (Super Admin)","role":"super_admin"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  -- 3. CRITICAL: Link entry in auth.identities (id is uuid type)
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

  -- 4. Map to public.profiles
  insert into public.profiles (
    id,
    user_id,
    email,
    full_name,
    role,
    employment_status,
    joining_date,
    work_location
  ) values (
    admin_uid,
    admin_uid,
    'info@thecodeyogi.com',
    'The Code Yogi (Super Admin)',
    'super_admin',
    'active',
    current_date,
    'Headquarters'
  )
  on conflict (email) do update
  set user_id = admin_uid,
      role = 'super_admin',
      full_name = 'The Code Yogi (Super Admin)';
end $$;
