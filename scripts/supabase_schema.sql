-- =====================================================================
-- TCY WorkHub — Complete Supabase PostgreSQL Schema & Security Policies
-- Lean MVP | October 2026
-- =====================================================================

-- Enable necessary extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 1. DEPARTMENTS
create table if not exists public.departments (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    code text not null unique,
    description text,
    manager_id uuid,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- 2. DESIGNATIONS
create table if not exists public.designations (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    department_id uuid references public.departments(id) on delete set null,
    level text default 'Mid',
    description text,
    created_at timestamptz default now() not null
);

-- 3. PROFILES / EMPLOYEES
create table if not exists public.profiles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid unique, -- References auth.users(id) when Supabase auth is active
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

-- Add manager foreign key to departments now that profiles exists
alter table public.departments 
    drop constraint if exists fk_departments_manager,
    add constraint fk_departments_manager foreign key (manager_id) references public.profiles(id) on delete set null;

-- 4. ATTENDANCE
create table if not exists public.attendance (
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

-- 5. ATTENDANCE CORRECTIONS
create table if not exists public.attendance_corrections (
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

-- 6. LEAVE TYPES
create table if not exists public.leave_types (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    code text not null unique,
    default_days integer not null default 12,
    is_paid boolean not null default true,
    description text,
    created_at timestamptz default now() not null
);

-- 7. LEAVE REQUESTS
create table if not exists public.leave_requests (
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

-- 8. PROJECTS
create table if not exists public.projects (
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

-- 9. PROJECT MEMBERS
create table if not exists public.project_members (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.projects(id) on delete cascade,
    employee_id uuid not null references public.profiles(id) on delete cascade,
    role text not null default 'contributor' check (role in ('lead', 'developer', 'designer', 'tester', 'viewer', 'contributor')),
    joined_at timestamptz default now() not null,
    unique (project_id, employee_id)
);

-- 10. TASKS
create table if not exists public.tasks (
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

-- 11. TASK COMMENTS
create table if not exists public.task_comments (
    id uuid primary key default gen_random_uuid(),
    task_id uuid not null references public.tasks(id) on delete cascade,
    employee_id uuid not null references public.profiles(id) on delete cascade,
    comment text not null,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- 12. STANDUPS
create table if not exists public.standups (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    date date not null default current_date,
    meeting_url text,
    cutoff_time text default '10:30',
    meeting_time text default '11:00',
    department_id uuid references public.departments(id) on delete set null,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz default now() not null
);

-- 13. STANDUP RESPONSES
create table if not exists public.standup_responses (
    id uuid primary key default gen_random_uuid(),
    standup_id uuid not null references public.standups(id) on delete cascade,
    employee_id uuid not null references public.profiles(id) on delete cascade,
    yesterday_work text not null,
    today_plan text not null,
    blockers text,
    status text not null default 'submitted' check (status in ('submitted', 'late', 'missed')),
    action_items jsonb default '[]'::jsonb,
    submitted_at timestamptz default now() not null,
    unique(standup_id, employee_id)
);

-- 14. MEETINGS
create table if not exists public.meetings (
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

-- 15. MEETING PARTICIPANTS
create table if not exists public.meeting_participants (
    id uuid primary key default gen_random_uuid(),
    meeting_id uuid not null references public.meetings(id) on delete cascade,
    employee_id uuid not null references public.profiles(id) on delete cascade,
    status text not null default 'invited' check (status in ('invited', 'accepted', 'declined', 'tentative')),
    joined_at timestamptz,
    unique (meeting_id, employee_id)
);

-- 16. NOTIFICATIONS
create table if not exists public.notifications (
    id uuid primary key default gen_random_uuid(),
    employee_id uuid not null references public.profiles(id) on delete cascade,
    title text not null,
    message text not null,
    type text not null default 'info' check (type in ('info', 'success', 'warning', 'error', 'task', 'leave', 'standup', 'meeting')),
    is_read boolean not null default false,
    action_url text,
    created_at timestamptz default now() not null
);

-- 17. AUDIT LOGS
create table if not exists public.audit_logs (
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

-- 18. HOLIDAYS
create table if not exists public.holidays (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    holiday_date date not null unique,
    is_optional boolean not null default false,
    description text,
    year integer not null default extract(year from current_date)
);

-- =====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================

alter table public.profiles enable row level security;
alter table public.departments enable row level security;
alter table public.designations enable row level security;
alter table public.attendance enable row level security;
alter table public.attendance_corrections enable row level security;
alter table public.leave_types enable row level security;
alter table public.leave_requests enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.standups enable row level security;
alter table public.standup_responses enable row level security;
alter table public.meetings enable row level security;
alter table public.meeting_participants enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.holidays enable row level security;

-- Helper functions for RLS
create or replace function public.current_profile_id()
returns uuid
language sql stable
as $$
  select id from public.profiles where user_id = auth.uid() limit 1;
$$;

create or replace function public.is_super_admin()
returns boolean
language sql stable
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and (role = 'super_admin' or email = 'info@thecodeyogi.com')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql stable
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role in ('admin', 'super_admin')
  );
$$;

create or replace function public.is_manager()
returns boolean
language sql stable
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role in ('manager', 'admin', 'super_admin')
  );
$$;

-- PROFILES POLICIES
create policy "Allow all authenticated users to view active profiles"
    on public.profiles for select
    to authenticated
    using (true);

create policy "Users can update their own profile"
    on public.profiles for update
    to authenticated
    using (user_id = auth.uid() or public.is_super_admin());

create policy "ONLY Super Admin can create and insert employee profiles"
    on public.profiles for insert
    to authenticated
    with check (public.is_super_admin());

create policy "ONLY Super Admin can delete employee profiles"
    on public.profiles for delete
    to authenticated
    using (public.is_super_admin());

-- ATTENDANCE POLICIES
create policy "Users can view their own attendance or managers/admins can view all"
    on public.attendance for select
    to authenticated
    using (
        employee_id = public.current_profile_id()
        or public.is_manager()
    );

create policy "Users can insert their own clock in"
    on public.attendance for insert
    to authenticated
    with check (employee_id = public.current_profile_id() or public.is_admin());

create policy "Users can update their own clock out"
    on public.attendance for update
    to authenticated
    using (employee_id = public.current_profile_id() or public.is_admin());

-- LEAVE REQUESTS POLICIES
create policy "Users view own leave requests, managers/admins view team"
    on public.leave_requests for select
    to authenticated
    using (
        employee_id = public.current_profile_id()
        or public.is_manager()
    );

create policy "Users can apply for leave"
    on public.leave_requests for insert
    to authenticated
    with check (employee_id = public.current_profile_id());

create policy "Managers/Admins can review leave requests"
    on public.leave_requests for update
    to authenticated
    using (
        public.is_manager() or employee_id = public.current_profile_id()
    );

-- PROJECTS & TASKS POLICIES
create policy "Authenticated users can view projects"
    on public.projects for select
    to authenticated
    using (true);

create policy "Managers and admins can create and edit projects"
    on public.projects for all
    to authenticated
    using (public.is_manager());

create policy "Authenticated users can view tasks"
    on public.tasks for select
    to authenticated
    using (true);

create policy "Members and managers can insert/update tasks"
    on public.tasks for all
    to authenticated
    using (true);

-- STANDUPS & RESPONSES POLICIES
create policy "View standups" on public.standups for select to authenticated using (true);
create policy "Manage standups" on public.standups for all to authenticated 
    using (public.is_manager() or (auth.jwt()->'user_metadata'->>'role') in ('manager', 'admin', 'super_admin') or created_by = public.current_profile_id())
    with check (public.is_manager() or (auth.jwt()->'user_metadata'->>'role') in ('manager', 'admin', 'super_admin') or created_by = public.current_profile_id());

create policy "View standup responses" on public.standup_responses for select to authenticated using (true);
create policy "Submit standup responses" on public.standup_responses for insert to authenticated 
    with check (employee_id = public.current_profile_id() or public.is_manager() or (auth.jwt()->'user_metadata'->>'role') in ('manager', 'admin', 'super_admin'));
create policy "Update standup responses" on public.standup_responses for update to authenticated 
    using (employee_id = public.current_profile_id() or public.is_manager() or (auth.jwt()->'user_metadata'->>'role') in ('manager', 'admin', 'super_admin'))
    with check (employee_id = public.current_profile_id() or public.is_manager() or (auth.jwt()->'user_metadata'->>'role') in ('manager', 'admin', 'super_admin'));

-- MEETINGS POLICIES
create policy "View meetings" on public.meetings for select to authenticated using (true);
create policy "Manage meetings" on public.meetings for all to authenticated using (true);
create policy "View meeting participants" on public.meeting_participants for select to authenticated using (true);
create policy "Manage meeting participants" on public.meeting_participants for all to authenticated using (true);

-- NOTIFICATIONS POLICIES
create policy "Users view their own notifications"
    on public.notifications for select
    to authenticated
    using (employee_id = public.current_profile_id() or public.is_admin());

create policy "Update notifications"
    on public.notifications for update
    to authenticated
    using (employee_id = public.current_profile_id());

-- HOLIDAYS & DEPARTMENTS & DESIGNATIONS & LEAVE TYPES ACCESS
create policy "View holidays" on public.holidays for select to authenticated using (true);
create policy "Manage holidays" on public.holidays for all to authenticated using (public.is_admin());

create policy "View departments" on public.departments for select to authenticated using (true);
create policy "Manage departments" on public.departments for all to authenticated using (true);

create policy "View designations" on public.designations for select to authenticated using (true);
create policy "Manage designations" on public.designations for all to authenticated using (true);

create policy "View leave types" on public.leave_types for select to authenticated using (true);
create policy "Manage leave types" on public.leave_types for all to authenticated using (public.is_admin());

-- Functions and Triggers for updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.handle_updated_at();
create trigger set_attendance_updated_at before update on public.attendance for each row execute function public.handle_updated_at();
create trigger set_leave_requests_updated_at before update on public.leave_requests for each row execute function public.handle_updated_at();
create trigger set_projects_updated_at before update on public.projects for each row execute function public.handle_updated_at();
create trigger set_tasks_updated_at before update on public.tasks for each row execute function public.handle_updated_at();
create trigger set_meetings_updated_at before update on public.meetings for each row execute function public.handle_updated_at();

-- Auto-provision profile on auth signup / user invitation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (
    user_id,
    email,
    full_name,
    role,
    employment_status,
    joining_date
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'employee'),
    'active',
    current_date
  )
  on conflict (email) do update
  set user_id = new.id;
  return new;
end;
$$;

-- Trigger on auth.users creation
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Default standard leave types configuration
insert into public.leave_types (name, code, default_days, is_paid, description) values
('Casual Leave', 'CL', 12, true, 'Standard short personal time off'),
('Sick Leave', 'SL', 8, true, 'Medical illness and healthcare recovery'),
('Earned Leave', 'EL', 15, true, 'Annual vacation and earned rest'),
('Compensatory Off', 'CO', 0, true, 'Compensatory off for weekend or overtime shifts')
on conflict (code) do nothing;

-- =====================================================================
-- AUTO-PROVISION SUPER ADMIN USER (info@thecodeyogi.com / TCY@2026)
-- =====================================================================
create extension if not exists pgcrypto with schema extensions;

do $$
declare
  admin_uid uuid := 'a0000000-0000-0000-0000-000000000001';
begin
  -- 1. Remove any partial/broken auth records
  delete from auth.identities where user_id = admin_uid or identity_data->>'email' = 'info@thecodeyogi.com';
  delete from auth.users where email = 'info@thecodeyogi.com' or id = admin_uid;

  -- 2. Insert into auth.users with complete GoTrue parameters
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

  -- 3. CRITICAL: Insert into auth.identities (GoTrue requires this for email password login)
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

  -- 4. Ensure public.profiles has super_admin role
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


