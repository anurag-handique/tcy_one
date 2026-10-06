-- =====================================================================
-- TCY One — AUTO-GENERATED ID SUPER ADMIN PROVISIONING
-- Email: info@thecodeyogi.com | Password: TCY@2026
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New query)
-- =====================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto" with schema extensions;

do $$
declare
  v_admin_uid uuid := gen_random_uuid(); -- Auto-generated unique ID
  v_dept_id uuid;
  v_desig_id uuid;
begin
  -- 1. Auto-create or get Department
  select id into v_dept_id from public.departments where lower(name) = 'engineering' limit 1;
  if v_dept_id is null then
    insert into public.departments (name, code, description, created_at, updated_at)
    values ('Engineering', 'ENG-101', 'Software Development & IT Infrastructure', now(), now())
    returning id into v_dept_id;
  end if;

  -- 2. Auto-create or get Designation
  select id into v_desig_id from public.designations where lower(title) = 'chief technology officer & founder' limit 1;
  if v_desig_id is null then
    insert into public.designations (title, department_id, level, description, created_at)
    values ('Chief Technology Officer & Founder', v_dept_id, 'Executive', 'Head of Technology & Leadership', now())
    returning id into v_desig_id;
  end if;

  -- 3. Clean any previous conflicting records for info@thecodeyogi.com
  delete from auth.identities where identity_data->>'email' = 'info@thecodeyogi.com';
  delete from auth.users where email = 'info@thecodeyogi.com';
  delete from public.profiles where email = 'info@thecodeyogi.com';

  -- 4. Create User in Supabase Auth (Password: TCY@2026) with Auto-Generated UUID
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
    v_admin_uid,
    'authenticated',
    'authenticated',
    'info@thecodeyogi.com',
    extensions.crypt('TCY@2026', extensions.gen_salt('bf')),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"The Code Yogi (Super Admin)","role":"super_admin","designation_title":"Chief Technology Officer & Founder"}'::jsonb,
    true,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  -- 5. Create Identity Link with Auto-Generated UUID
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
    v_admin_uid,
    format('{"sub":"%s","email":"%s"}', v_admin_uid, 'info@thecodeyogi.com')::jsonb,
    'email',
    v_admin_uid::text,
    now(),
    now(),
    now()
  );

  -- 6. Create Profile in public.profiles with Auto-Generated UUID
  insert into public.profiles (
    id,
    user_id,
    email,
    full_name,
    role,
    department_id,
    designation_id,
    employment_status,
    joining_date,
    work_location,
    avatar_url,
    created_at,
    updated_at
  ) values (
    v_admin_uid,
    v_admin_uid,
    'info@thecodeyogi.com',
    'The Code Yogi (Super Admin)',
    'super_admin',
    v_dept_id,
    v_desig_id,
    'active',
    '2026-01-01',
    'Headquarters',
    '/favicon (1).ico',
    now(),
    now()
  )
  on conflict (email) do update
  set role = 'super_admin',
      user_id = v_admin_uid,
      department_id = v_dept_id,
      designation_id = v_desig_id,
      updated_at = now();

end;
$$;

-- Reload Schema Cache
notify pgrst, 'reload schema';
