-- =====================================================================
-- TCY One — COMPLETE DATABASE WIPE & FRESH PRODUCTION SETUP
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New query)
-- =====================================================================

-- ---------------------------------------------------------------------
-- STEP 1: DROP ALL EXISTING TRIGGERS, FUNCTIONS, AND TABLES
-- ---------------------------------------------------------------------

drop trigger if exists on_auth_user_created on auth.users cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.create_employee_account cascade;
drop function if exists public.create_employee_account(text, text, text, text, text, text, text) cascade;
drop function if exists public.create_employee_account(text, text, text, text, text, text, text, text) cascade;
drop function if exists public.current_profile_id cascade;
drop function if exists public.is_super_admin cascade;
drop function if exists public.is_admin cascade;
drop function if exists public.is_manager cascade;

drop table if exists public.task_comments cascade;
drop table if exists public.tasks cascade;
drop table if exists public.project_members cascade;
drop table if exists public.projects cascade;
drop table if exists public.meeting_participants cascade;
drop table if exists public.meetings cascade;
drop table if exists public.standup_responses cascade;
drop table if exists public.standups cascade;
drop table if exists public.attendance_corrections cascade;
drop table if exists public.attendance cascade;
drop table if exists public.leave_requests cascade;
drop table if exists public.leave_types cascade;
drop table if exists public.notifications cascade;
drop table if exists public.audit_logs cascade;
drop table if exists public.holidays cascade;
drop table if exists public.profiles cascade;
drop table if exists public.designations cascade;
drop table if exists public.departments cascade;

-- ---------------------------------------------------------------------
-- STEP 2: EXTENSIONS & PERMISSIONS
-- ---------------------------------------------------------------------

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto" with schema extensions;

grant usage on schema public to postgres, anon, authenticated, service_role, supabase_auth_admin, authenticator;
grant usage on schema auth to postgres, supabase_auth_admin, authenticator;

-- ---------------------------------------------------------------------
-- STEP 3: CREATE TABLES
-- ---------------------------------------------------------------------

-- 1. Departments
create table public.departments (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    code text not null unique,
    description text,
    manager_id uuid,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- 2. Designations
create table public.designations (
    id uuid primary key default gen_random_uuid(),
    title text not null unique,
    department_id uuid references public.departments(id) on delete set null,
    level text default 'Mid',
    description text,
    created_at timestamptz default now() not null
);

-- 3. Profiles / Employees
create table public.profiles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid unique,
    email text not null unique,
    full_name text not null,
    avatar_url text,
    phone text,
    department_id uuid references public.departments(id) on delete set null,
    designation_id uuid references public.designations(id) on delete set null,
    manager_id uuid references public.profiles(id) on delete set null,
    role text not null default 'employee' check (role in ('employee', 'manager', 'admin', 'super_admin')),
    employment_status text not null default 'active' check (employment_status in ('active', 'on_leave', 'probation', 'terminated')),
    joining_date date default current_date not null,
    address text,
    emergency_contact text,
    work_location text default 'Office',
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- Add manager foreign key on departments
alter table public.departments 
    add constraint fk_departments_manager foreign key (manager_id) references public.profiles(id) on delete set null;

-- 4. Attendance
create table public.attendance (
    id uuid primary key default gen_random_uuid(),
    employee_id uuid not null references public.profiles(id) on delete cascade,
    date date not null default current_date,
    clock_in timestamptz not null default now(),
    clock_out timestamptz,
    total_hours numeric(5,2) default 0,
    overtime_hours numeric(5,2) default 0,
    status text not null default 'present' check (status in ('present', 'late', 'half_day', 'absent', 'on_leave')),
    work_mode text not null default 'office' check (work_mode in ('office', 'remote', 'hybrid')),
    punch_in_location text,
    punch_out_location text,
    notes text,
    ip_address text,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null,
    unique(employee_id, date)
);

-- 5. Attendance Corrections
create table public.attendance_corrections (
    id uuid primary key default gen_random_uuid(),
    attendance_id uuid references public.attendance(id) on delete cascade,
    employee_id uuid not null references public.profiles(id) on delete cascade,
    requested_by uuid not null references public.profiles(id) on delete cascade,
    date date not null,
    corrected_clock_in timestamptz,
    corrected_clock_out timestamptz,
    reason text not null,
    status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
    reviewed_by uuid references public.profiles(id) on delete set null,
    review_note text,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- 6. Leave Types
create table public.leave_types (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    code text not null unique,
    default_days integer not null default 12,
    is_paid boolean not null default true,
    description text,
    created_at timestamptz default now() not null
);

-- 7. Leave Requests
create table public.leave_requests (
    id uuid primary key default gen_random_uuid(),
    employee_id uuid not null references public.profiles(id) on delete cascade,
    leave_type_id uuid not null references public.leave_types(id) on delete restrict,
    start_date date not null,
    end_date date not null,
    total_days numeric(4,1) not null default 1,
    reason text not null,
    status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
    approver_id uuid references public.profiles(id) on delete set null,
    approver_note text,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- 8. Projects
create table public.projects (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    code text not null unique,
    description text,
    client_name text,
    status text not null default 'active' check (status in ('planning', 'active', 'on_hold', 'completed', 'archived')),
    priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
    start_date date default current_date,
    due_date date,
    manager_id uuid references public.profiles(id) on delete set null,
    budget numeric(12,2) default 0,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- 9. Project Members
create table public.project_members (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.projects(id) on delete cascade,
    employee_id uuid not null references public.profiles(id) on delete cascade,
    role text not null default 'contributor' check (role in ('lead', 'developer', 'designer', 'tester', 'viewer', 'contributor')),
    joined_at timestamptz default now() not null,
    unique (project_id, employee_id)
);

-- 10. Tasks
create table public.tasks (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.projects(id) on delete cascade,
    title text not null,
    description text,
    status text not null default 'todo' check (status in ('todo', 'in_progress', 'review', 'done')),
    priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
    assignee_id uuid references public.profiles(id) on delete set null,
    reporter_id uuid references public.profiles(id) on delete set null,
    due_date date,
    estimated_hours numeric(5,2) default 0,
    actual_hours numeric(5,2) default 0,
    tags text[] default array[]::text[],
    order_index integer default 0,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- 11. Task Comments
create table public.task_comments (
    id uuid primary key default gen_random_uuid(),
    task_id uuid not null references public.tasks(id) on delete cascade,
    employee_id uuid not null references public.profiles(id) on delete cascade,
    comment text not null,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- 12. Standups
create table public.standups (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    date date not null default current_date,
    department_id uuid references public.departments(id) on delete set null,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz default now() not null
);

-- 13. Standup Responses
create table public.standup_responses (
    id uuid primary key default gen_random_uuid(),
    standup_id uuid not null references public.standups(id) on delete cascade,
    employee_id uuid not null references public.profiles(id) on delete cascade,
    yesterday_work text not null,
    today_plan text not null,
    blockers text,
    action_items jsonb default '[]'::jsonb,
    submitted_at timestamptz default now() not null,
    unique(standup_id, employee_id)
);

-- 14. Meetings
create table public.meetings (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    description text,
    agenda text,
    meeting_url text,
    room_location text,
    start_time timestamptz not null,
    end_time timestamptz not null,
    status text not null default 'scheduled' check (status in ('scheduled', 'ongoing', 'completed', 'cancelled')),
    created_by uuid not null references public.profiles(id) on delete cascade,
    project_id uuid references public.projects(id) on delete set null,
    notes text,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- 15. Meeting Participants
create table public.meeting_participants (
    id uuid primary key default gen_random_uuid(),
    meeting_id uuid not null references public.meetings(id) on delete cascade,
    employee_id uuid not null references public.profiles(id) on delete cascade,
    status text not null default 'invited' check (status in ('invited', 'accepted', 'declined', 'tentative')),
    joined_at timestamptz,
    unique (meeting_id, employee_id)
);

-- 16. Notifications
create table public.notifications (
    id uuid primary key default gen_random_uuid(),
    employee_id uuid not null references public.profiles(id) on delete cascade,
    title text not null,
    message text not null,
    type text not null default 'info' check (type in ('info', 'success', 'warning', 'error', 'task', 'leave', 'standup', 'meeting')),
    is_read boolean not null default false,
    action_url text,
    created_at timestamptz default now() not null
);

-- 17. Audit Logs
create table public.audit_logs (
    id uuid primary key default gen_random_uuid(),
    actor_id uuid references public.profiles(id) on delete set null,
    action text not null,
    entity_type text not null,
    entity_id text,
    old_data jsonb,
    new_data jsonb,
    ip_address text,
    created_at timestamptz default now() not null
);

-- 18. Holidays
create table public.holidays (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    holiday_date date not null unique,
    is_optional boolean not null default false,
    description text,
    year integer not null default extract(year from current_date)
);

-- ---------------------------------------------------------------------
-- STEP 4: PERMISSION GRANTS ACROSS ALL TABLES & SCHEMAS
-- ---------------------------------------------------------------------

grant all on all tables in schema public to postgres, anon, authenticated, service_role, supabase_auth_admin, authenticator;
grant all on all sequences in schema public to postgres, anon, authenticated, service_role, supabase_auth_admin, authenticator;
grant all on all routines in schema public to postgres, anon, authenticated, service_role, supabase_auth_admin, authenticator;

grant all on all tables in schema auth to postgres, supabase_auth_admin;
grant all on all sequences in schema auth to postgres, supabase_auth_admin;
grant all on all routines in schema auth to postgres, supabase_auth_admin;

alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role, supabase_auth_admin, authenticator;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role, supabase_auth_admin, authenticator;
alter default privileges in schema public grant all on routines to postgres, anon, authenticated, service_role, supabase_auth_admin, authenticator;

-- ---------------------------------------------------------------------
-- STEP 5: AUTH TRIGGER FUNCTION (Safe GoTrue Sync)
-- ---------------------------------------------------------------------

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
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- STEP 6: EMPLOYEE ONBOARDING RPC FUNCTION
-- ---------------------------------------------------------------------

create or replace function public.create_employee_account(
  p_email text,
  p_password text,
  p_full_name text,
  p_role text default 'employee',
  p_department_name text default null,
  p_designation_title text default 'Software Engineer',
  p_phone text default null,
  p_work_location text default 'Office'
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_user_id uuid;
  v_dept_id uuid;
  v_dept_code text;
  v_desig_id uuid;
begin
  -- Input Validation
  if p_email is null or trim(p_email) = '' then
    raise exception 'Email is required';
  end if;
  if p_password is null or length(trim(p_password)) < 6 then
    raise exception 'Password must be at least 6 characters';
  end if;
  if p_full_name is null or trim(p_full_name) = '' then
    raise exception 'Full Name is required';
  end if;

  -- 1. Handle Department
  if p_department_name is not null and trim(p_department_name) <> '' then
    select id into v_dept_id 
    from public.departments 
    where lower(name) = lower(trim(p_department_name))
    limit 1;

    if v_dept_id is null then
      v_dept_code := upper(regexp_replace(trim(p_department_name), '[^a-zA-Z0-9]', '', 'g'));
      if length(v_dept_code) > 6 then
        v_dept_code := substring(v_dept_code from 1 for 6);
      end if;
      if v_dept_code = '' then
        v_dept_code := 'DEPT';
      end if;

      insert into public.departments (id, name, code, created_at, updated_at)
      values (
        gen_random_uuid(), 
        trim(p_department_name), 
        v_dept_code || '-' || floor(random() * 900 + 100)::text, 
        now(), 
        now()
      )
      returning id into v_dept_id;
    end if;
  end if;

  -- 2. Handle Designation
  if p_designation_title is not null and trim(p_designation_title) <> '' then
    select id into v_desig_id 
    from public.designations 
    where lower(title) = lower(trim(p_designation_title))
    limit 1;

    if v_desig_id is null then
      insert into public.designations (id, title, department_id, level, created_at)
      values (
        gen_random_uuid(),
        trim(p_designation_title),
        v_dept_id,
        'Mid',
        now()
      )
      returning id into v_desig_id;
    end if;
  end if;

  -- 3. Check / Provision auth.users
  select id into v_user_id from auth.users where lower(email) = lower(trim(p_email));

  if v_user_id is not null then
    update auth.users
    set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
        raw_user_meta_data = jsonb_build_object('full_name', p_full_name, 'role', p_role, 'designation_title', coalesce(p_designation_title, 'Software Engineer')),
        updated_at = now()
    where id = v_user_id;
  else
    v_user_id := gen_random_uuid();

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
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      lower(trim(p_email)),
      extensions.crypt(p_password, extensions.gen_salt('bf')),
      now(),
      null,
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', p_full_name, 'role', p_role, 'designation_title', coalesce(p_designation_title, 'Software Engineer')),
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

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
      v_user_id,
      format('{"sub":"%s","email":"%s"}', v_user_id, lower(trim(p_email)))::jsonb,
      'email',
      v_user_id::text,
      null,
      now(),
      now()
    );
  end if;

  -- 4. Upsert into public.profiles
  insert into public.profiles (
    id,
    user_id,
    email,
    full_name,
    role,
    department_id,
    designation_id,
    phone,
    work_location,
    employment_status,
    joining_date,
    created_at,
    updated_at
  ) values (
    v_user_id,
    v_user_id,
    lower(trim(p_email)),
    p_full_name,
    p_role,
    v_dept_id,
    v_desig_id,
    p_phone,
    p_work_location,
    'active',
    current_date,
    now(),
    now()
  )
  on conflict (email) do update
  set user_id = v_user_id,
      full_name = p_full_name,
      role = p_role,
      department_id = coalesce(v_dept_id, public.profiles.department_id),
      designation_id = coalesce(v_desig_id, public.profiles.designation_id),
      phone = coalesce(p_phone, public.profiles.phone),
      work_location = coalesce(p_work_location, public.profiles.work_location),
      updated_at = now();

  return jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', lower(trim(p_email)),
    'department_id', v_dept_id,
    'designation_id', v_desig_id
  );
end;
$$;

grant execute on function public.create_employee_account(text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.create_employee_account(text, text, text, text, text, text, text, text) to anon;

-- ---------------------------------------------------------------------
-- STEP 7: SEED PRODUCTION DATA (Departments, Designations, Super Admin)
-- ---------------------------------------------------------------------

-- Seed Core Departments
insert into public.departments (id, name, code, description) values
    ('d0000000-0000-0000-0000-000000000001', 'Engineering', 'ENG-101', 'Software development and technical infrastructure'),
    ('d0000000-0000-0000-0000-000000000002', 'Product & Design', 'PRD-102', 'Product management and UI/UX design'),
    ('d0000000-0000-0000-0000-000000000003', 'Marketing', 'MKT-103', 'Brand growth and market campaigns'),
    ('d0000000-0000-0000-0000-000000000004', 'Human Resources', 'HR-104', 'Talent acquisition, employee care and operations'),
    ('d0000000-0000-0000-0000-000000000005', 'Finance', 'FIN-105', 'Financial planning and corporate payroll'),
    ('d0000000-0000-0000-0000-000000000006', 'Operations', 'OPS-106', 'Business administration and internal processes')
on conflict (name) do nothing;

-- Seed Standard Designations
insert into public.designations (id, title, department_id, level) values
    ('de000000-0000-0000-0000-000000000001', 'Chief Technology Officer & Founder', 'd0000000-0000-0000-0000-000000000001', 'Executive'),
    ('de000000-0000-0000-0000-000000000002', 'Engineering Lead', 'd0000000-0000-0000-0000-000000000001', 'Lead'),
    ('de000000-0000-0000-0000-000000000003', 'Senior Full Stack Developer', 'd0000000-0000-0000-0000-000000000001', 'Senior'),
    ('de000000-0000-0000-0000-000000000004', 'Full Stack Developer', 'd0000000-0000-0000-0000-000000000001', 'Mid'),
    ('de000000-0000-0000-0000-000000000005', 'Frontend Developer', 'd0000000-0000-0000-0000-000000000001', 'Mid'),
    ('de000000-0000-0000-0000-000000000006', 'Backend Developer', 'd0000000-0000-0000-0000-000000000001', 'Mid'),
    ('de000000-0000-0000-0000-000000000007', 'UI/UX Designer', 'd0000000-0000-0000-0000-000000000002', 'Mid'),
    ('de000000-0000-0000-0000-000000000008', 'Product Manager', 'd0000000-0000-0000-0000-000000000002', 'Lead'),
    ('de000000-0000-0000-0000-000000000009', 'HR Manager', 'd0000000-0000-0000-0000-000000000004', 'Lead'),
    ('de000000-0000-0000-0000-000000000010', 'QA Engineer', 'd0000000-0000-0000-0000-000000000001', 'Mid')
on conflict (title) do nothing;

-- Seed Standard Leave Types
insert into public.leave_types (id, name, code, default_days, is_paid, description) values
    ('b0000000-0000-0000-0000-000000000001', 'Casual Leave', 'CL', 12, true, 'Paid casual leave for personal matters'),
    ('b0000000-0000-0000-0000-000000000002', 'Sick Leave', 'SL', 8, true, 'Paid leave for medical recovery'),
    ('b0000000-0000-0000-0000-000000000003', 'Earned Leave', 'EL', 15, true, 'Accrued annual vacation leave'),
    ('b0000000-0000-0000-0000-000000000004', 'Unpaid Leave', 'LWP', 0, false, 'Leave without pay')
on conflict (name) do nothing;

-- Seed Super Admin Account in auth.users and public.profiles
do $$
declare
  admin_uid uuid := 'a0000000-0000-0000-0000-000000000001';
begin
  -- 1. Clean previous admin records
  delete from auth.identities where user_id = admin_uid or identity_data->>'email' = 'info@thecodeyogi.com';
  delete from auth.users where email = 'info@thecodeyogi.com' or id = admin_uid;

  -- 2. Insert into auth.users (password: TCY@2026)
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
    '{"full_name":"The Code Yogi (Super Admin)","role":"super_admin","designation_title":"Chief Technology Officer & Founder"}'::jsonb,
    true,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  -- 3. Link in auth.identities
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

  -- 4. Create Super Admin Profile in public.profiles
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
    admin_uid,
    admin_uid,
    'info@thecodeyogi.com',
    'The Code Yogi (Super Admin)',
    'super_admin',
    'd0000000-0000-0000-0000-000000000001',
    'de000000-0000-0000-0000-000000000001',
    'active',
    '2026-01-01',
    'Headquarters',
    '/favicon (1).ico',
    now(),
    now()
  )
  on conflict (email) do update
  set role = 'super_admin',
      user_id = admin_uid,
      department_id = 'd0000000-0000-0000-0000-000000000001',
      designation_id = 'de000000-0000-0000-0000-000000000001',
      updated_at = now();
end;
$$;

-- ---------------------------------------------------------------------
-- STEP 8: RELOAD SCHEMA CACHE
-- ---------------------------------------------------------------------

notify pgrst, 'reload schema';
