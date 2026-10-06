-- =====================================================================
-- TCY One — COMPLETE RBAC & RLS PRODUCTION DATABASE SETUP SCRIPT
-- Idempotent, High-Performance, Secure Row-Level Security Configuration
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- =====================================================================

-- ---------------------------------------------------------------------
-- STEP 1: DROP OLD POLICIES, TRIGGERS & FUNCTIONS
-- ---------------------------------------------------------------------

drop trigger if exists on_auth_user_created on auth.users cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.create_employee_account cascade;
drop function if exists public.create_employee_account(text, text, text, text, text, text, text) cascade;
drop function if exists public.create_employee_account(text, text, text, text, text, text, text, text) cascade;
drop function if exists public.current_profile_id cascade;
drop function if exists public.get_auth_role cascade;
drop function if exists public.is_super_admin cascade;
drop function if exists public.is_admin cascade;
drop function if exists public.is_manager cascade;

-- ---------------------------------------------------------------------
-- STEP 2: EXTENSIONS & SCHEMAS
-- ---------------------------------------------------------------------

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto" with schema extensions;

grant usage on schema public to postgres, anon, authenticated, service_role, supabase_auth_admin, authenticator;
grant usage on schema auth to postgres, supabase_auth_admin, authenticator;

-- ---------------------------------------------------------------------
-- STEP 3: CREATE ALL TABLES
-- ---------------------------------------------------------------------

-- 1. Departments
create table if not exists public.departments (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    code text not null unique,
    description text,
    manager_id uuid,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- 2. Designations
create table if not exists public.designations (
    id uuid primary key default gen_random_uuid(),
    title text not null unique,
    department_id uuid references public.departments(id) on delete set null,
    level text default 'Mid',
    description text,
    created_at timestamptz default now() not null
);

-- 3. Profiles
create table if not exists public.profiles (
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

-- Ensure department manager constraint links to profiles
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'fk_departments_manager'
  ) then
    alter table public.departments 
      add constraint fk_departments_manager foreign key (manager_id) references public.profiles(id) on delete set null;
  end if;
end $$;

-- 4. Attendance
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

-- 5. Attendance Corrections
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

-- 6. Leave Types
create table if not exists public.leave_types (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    code text not null unique,
    default_days integer not null default 12,
    is_paid boolean not null default true,
    description text,
    created_at timestamptz default now() not null
);

-- 7. Leave Requests
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

-- 8. Projects
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

-- 9. Project Members
create table if not exists public.project_members (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.projects(id) on delete cascade,
    employee_id uuid not null references public.profiles(id) on delete cascade,
    role text not null default 'contributor' check (role in ('lead', 'developer', 'designer', 'tester', 'viewer', 'contributor')),
    joined_at timestamptz default now() not null,
    unique (project_id, employee_id)
);

-- 10. Tasks
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

-- 11. Task Comments
create table if not exists public.task_comments (
    id uuid primary key default gen_random_uuid(),
    task_id uuid not null references public.tasks(id) on delete cascade,
    employee_id uuid not null references public.profiles(id) on delete cascade,
    comment text not null,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- 12. Standups
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

-- 13. Standup Responses
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

-- 14. Meetings
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

-- 15. Meeting Participants
create table if not exists public.meeting_participants (
    id uuid primary key default gen_random_uuid(),
    meeting_id uuid not null references public.meetings(id) on delete cascade,
    employee_id uuid not null references public.profiles(id) on delete cascade,
    status text not null default 'invited' check (status in ('invited', 'accepted', 'declined', 'tentative')),
    joined_at timestamptz,
    unique (meeting_id, employee_id)
);

-- 16. Notifications
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

-- 17. Audit Logs
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

-- 18. Holidays
create table if not exists public.holidays (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    holiday_date date not null unique,
    is_optional boolean not null default false,
    description text,
    year integer not null default extract(year from current_date)
);

-- ---------------------------------------------------------------------
-- STEP 4: SECURITY HELPER FUNCTIONS (Zero Recursion)
-- ---------------------------------------------------------------------

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select id from public.profiles where user_id = auth.uid() or id = auth.uid() limit 1;
$$;

create or replace function public.get_auth_role()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(
    (select role from public.profiles where user_id = auth.uid() or id = auth.uid() limit 1),
    coalesce(auth.jwt()->'user_metadata'->>'role', 'employee')
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.get_auth_role() = 'super_admin';
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.get_auth_role() in ('admin', 'super_admin');
$$;

create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.get_auth_role() in ('manager', 'admin', 'super_admin');
$$;

grant execute on function public.current_profile_id to authenticated, anon;
grant execute on function public.get_auth_role to authenticated, anon;
grant execute on function public.is_super_admin to authenticated, anon;
grant execute on function public.is_admin to authenticated, anon;
grant execute on function public.is_manager to authenticated, anon;

-- ---------------------------------------------------------------------
-- STEP 5: ENABLE ROW LEVEL SECURITY (RLS) & DEFINE POLICIES
-- ---------------------------------------------------------------------

-- Enable RLS on all tables
alter table public.departments enable row level security;
alter table public.designations enable row level security;
alter table public.profiles enable row level security;
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

-- 1. Profiles Policies
drop policy if exists "Profiles are viewable by authenticated users" on public.profiles;
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "Profiles can be updated by self or admin" on public.profiles;
create policy "Profiles can be updated by self or admin"
  on public.profiles for update
  to authenticated
  using (
    user_id = auth.uid() 
    or id = auth.uid() 
    or public.is_admin()
  );

drop policy if exists "Profiles can be inserted by admin or trigger" on public.profiles;
create policy "Profiles can be inserted by admin or trigger"
  on public.profiles for insert
  to authenticated
  with check (public.is_admin() or user_id = auth.uid());

drop policy if exists "Profiles can be deleted by super admin" on public.profiles;
create policy "Profiles can be deleted by super admin"
  on public.profiles for delete
  to authenticated
  using (public.is_super_admin());

-- 2. Departments Policies
drop policy if exists "Departments viewable by authenticated" on public.departments;
create policy "Departments viewable by authenticated"
  on public.departments for select
  to authenticated
  using (true);

drop policy if exists "Departments manageable by admin" on public.departments;
create policy "Departments manageable by admin"
  on public.departments for all
  to authenticated
  using (public.is_admin());

-- 3. Designations Policies
drop policy if exists "Designations viewable by authenticated" on public.designations;
create policy "Designations viewable by authenticated"
  on public.designations for select
  to authenticated
  using (true);

drop policy if exists "Designations manageable by admin" on public.designations;
create policy "Designations manageable by admin"
  on public.designations for all
  to authenticated
  using (public.is_admin());

-- 4. Attendance Policies
drop policy if exists "Attendance viewable by owner, manager, admin" on public.attendance;
create policy "Attendance viewable by owner, manager, admin"
  on public.attendance for select
  to authenticated
  using (
    employee_id = public.current_profile_id()
    or public.is_manager()
  );

drop policy if exists "Attendance insertable by owner or admin" on public.attendance;
create policy "Attendance insertable by owner or admin"
  on public.attendance for insert
  to authenticated
  with check (
    employee_id = public.current_profile_id()
    or public.is_admin()
  );

drop policy if exists "Attendance updateable by owner (clockout) or admin" on public.attendance;
create policy "Attendance updateable by owner (clockout) or admin"
  on public.attendance for update
  to authenticated
  using (
    employee_id = public.current_profile_id()
    or public.is_admin()
  );

-- 5. Attendance Corrections Policies
drop policy if exists "Attendance corrections viewable by owner, manager, admin" on public.attendance_corrections;
create policy "Attendance corrections viewable by owner, manager, admin"
  on public.attendance_corrections for select
  to authenticated
  using (
    employee_id = public.current_profile_id()
    or requested_by = public.current_profile_id()
    or public.is_manager()
  );

drop policy if exists "Attendance corrections insertable by employee" on public.attendance_corrections;
create policy "Attendance corrections insertable by employee"
  on public.attendance_corrections for insert
  to authenticated
  with check (
    requested_by = public.current_profile_id()
    or employee_id = public.current_profile_id()
    or public.is_admin()
  );

drop policy if exists "Attendance corrections manageable by manager or admin" on public.attendance_corrections;
create policy "Attendance corrections manageable by manager or admin"
  on public.attendance_corrections for update
  to authenticated
  using (public.is_manager());

-- 6. Leave Types Policies
drop policy if exists "Leave types viewable by authenticated" on public.leave_types;
create policy "Leave types viewable by authenticated"
  on public.leave_types for select
  to authenticated
  using (true);

drop policy if exists "Leave types manageable by admin" on public.leave_types;
create policy "Leave types manageable by admin"
  on public.leave_types for all
  to authenticated
  using (public.is_admin());

-- 7. Leave Requests Policies
drop policy if exists "Leave requests viewable by owner, manager, admin" on public.leave_requests;
create policy "Leave requests viewable by owner, manager, admin"
  on public.leave_requests for select
  to authenticated
  using (
    employee_id = public.current_profile_id()
    or public.is_manager()
  );

drop policy if exists "Leave requests insertable by owner" on public.leave_requests;
create policy "Leave requests insertable by owner"
  on public.leave_requests for insert
  to authenticated
  with check (
    employee_id = public.current_profile_id()
    or public.is_admin()
  );

drop policy if exists "Leave requests manageable by manager, admin, or self cancel" on public.leave_requests;
create policy "Leave requests manageable by manager, admin, or self cancel"
  on public.leave_requests for update
  to authenticated
  using (
    public.is_manager()
    or (employee_id = public.current_profile_id() and status = 'pending')
  );

-- 8. Projects & Members Policies
drop policy if exists "Projects viewable by authenticated" on public.projects;
create policy "Projects viewable by authenticated"
  on public.projects for select
  to authenticated
  using (true);

drop policy if exists "Projects manageable by manager or admin" on public.projects;
create policy "Projects manageable by manager or admin"
  on public.projects for all
  to authenticated
  using (public.is_manager());

drop policy if exists "Project members viewable by authenticated" on public.project_members;
create policy "Project members viewable by authenticated"
  on public.project_members for select
  to authenticated
  using (true);

drop policy if exists "Project members manageable by manager or admin" on public.project_members;
create policy "Project members manageable by manager or admin"
  on public.project_members for all
  to authenticated
  using (public.is_manager());

-- 9. Tasks Policies (Employee Self-Task & Team Task Allocation)
drop policy if exists "Tasks viewable by authenticated" on public.tasks;
create policy "Tasks viewable by authenticated"
  on public.tasks for select
  to authenticated
  using (true);

drop policy if exists "Tasks insertable by any authenticated user" on public.tasks;
create policy "Tasks insertable by any authenticated user"
  on public.tasks for insert
  to authenticated
  with check (true);

drop policy if exists "Tasks updateable by assignee, reporter, manager, admin" on public.tasks;
create policy "Tasks updateable by assignee, reporter, manager, admin"
  on public.tasks for update
  to authenticated
  using (
    assignee_id = public.current_profile_id()
    or reporter_id = public.current_profile_id()
    or public.is_manager()
  );

drop policy if exists "Tasks deletable by reporter, manager, admin" on public.tasks;
create policy "Tasks deletable by reporter, manager, admin"
  on public.tasks for delete
  to authenticated
  using (
    reporter_id = public.current_profile_id()
    or public.is_manager()
  );

-- 10. Task Comments Policies
drop policy if exists "Task comments viewable by authenticated" on public.task_comments;
create policy "Task comments viewable by authenticated"
  on public.task_comments for select
  to authenticated
  using (true);

drop policy if exists "Task comments insertable by author" on public.task_comments;
create policy "Task comments insertable by author"
  on public.task_comments for insert
  to authenticated
  with check (employee_id = public.current_profile_id());

drop policy if exists "Task comments deletable by author or admin" on public.task_comments;
create policy "Task comments deletable by author or admin"
  on public.task_comments for delete
  to authenticated
  using (
    employee_id = public.current_profile_id()
    or public.is_admin()
  );

-- 11. Standups & Standup Responses
drop policy if exists "Standups viewable by authenticated" on public.standups;
create policy "Standups viewable by authenticated"
  on public.standups for select
  to authenticated
  using (true);

drop policy if exists "Standups manageable by manager or admin" on public.standups;
drop policy if exists "Standups insertable by manager or admin" on public.standups;
drop policy if exists "Standups updateable by manager or admin" on public.standups;
drop policy if exists "Standups deletable by manager or admin" on public.standups;

create policy "Standups insertable by manager or admin"
  on public.standups for insert
  to authenticated
  with check (
    public.is_manager() 
    or public.is_admin() 
    or public.is_super_admin()
    or (auth.jwt()->'user_metadata'->>'role') in ('manager', 'admin', 'super_admin')
    or created_by = public.current_profile_id()
  );

create policy "Standups updateable by manager or admin"
  on public.standups for update
  to authenticated
  using (
    public.is_manager() 
    or public.is_admin() 
    or public.is_super_admin()
    or (auth.jwt()->'user_metadata'->>'role') in ('manager', 'admin', 'super_admin')
    or created_by = public.current_profile_id()
  )
  with check (
    public.is_manager() 
    or public.is_admin() 
    or public.is_super_admin()
    or (auth.jwt()->'user_metadata'->>'role') in ('manager', 'admin', 'super_admin')
    or created_by = public.current_profile_id()
  );

create policy "Standups deletable by manager or admin"
  on public.standups for delete
  to authenticated
  using (
    public.is_manager() 
    or public.is_admin() 
    or public.is_super_admin()
    or (auth.jwt()->'user_metadata'->>'role') in ('manager', 'admin', 'super_admin')
  );

drop policy if exists "Standup responses viewable by authenticated" on public.standup_responses;
create policy "Standup responses viewable by authenticated"
  on public.standup_responses for select
  to authenticated
  using (true);

drop policy if exists "Standup responses insertable by employee" on public.standup_responses;
create policy "Standup responses insertable by employee"
  on public.standup_responses for insert
  to authenticated
  with check (
    employee_id = public.current_profile_id()
    or public.is_manager()
    or (auth.jwt()->'user_metadata'->>'role') in ('manager', 'admin', 'super_admin')
  );

drop policy if exists "Standup responses updateable by employee or manager" on public.standup_responses;
create policy "Standup responses updateable by employee or manager"
  on public.standup_responses for update
  to authenticated
  using (
    employee_id = public.current_profile_id()
    or public.is_manager()
    or (auth.jwt()->'user_metadata'->>'role') in ('manager', 'admin', 'super_admin')
  )
  with check (
    employee_id = public.current_profile_id()
    or public.is_manager()
    or (auth.jwt()->'user_metadata'->>'role') in ('manager', 'admin', 'super_admin')
  );

-- 12. Meetings & Participants
drop policy if exists "Meetings viewable by authenticated" on public.meetings;
drop policy if exists "Meetings insertable by authenticated" on public.meetings;
drop policy if exists "Meetings updatable by creator or manager/admin" on public.meetings;
drop policy if exists "Meetings deletable by creator or manager/admin" on public.meetings;
drop policy if exists "Meetings manageable by creator, manager, admin" on public.meetings;

create policy "Meetings viewable by authenticated"
  on public.meetings for select
  to authenticated
  using (true);

create policy "Meetings insertable by authenticated"
  on public.meetings for insert
  to authenticated
  with check (true);

create policy "Meetings updatable by creator or manager/admin"
  on public.meetings for update
  to authenticated
  using (
    created_by = auth.uid()
    or created_by = public.current_profile_id()
    or created_by in (select id from public.profiles where user_id = auth.uid() or id = auth.uid())
    or public.is_manager()
  )
  with check (true);

create policy "Meetings deletable by creator or manager/admin"
  on public.meetings for delete
  to authenticated
  using (
    created_by = auth.uid()
    or created_by = public.current_profile_id()
    or created_by in (select id from public.profiles where user_id = auth.uid() or id = auth.uid())
    or public.is_manager()
  );

drop policy if exists "Meeting participants viewable by authenticated" on public.meeting_participants;
drop policy if exists "Meeting participants insertable by authenticated" on public.meeting_participants;
drop policy if exists "Meeting participants updatable by self or host/manager" on public.meeting_participants;
drop policy if exists "Meeting participants deletable by self or host/manager" on public.meeting_participants;
drop policy if exists "Meeting participants manageable by meeting owner or self" on public.meeting_participants;

create policy "Meeting participants viewable by authenticated"
  on public.meeting_participants for select
  to authenticated
  using (true);

create policy "Meeting participants insertable by authenticated"
  on public.meeting_participants for insert
  to authenticated
  with check (true);

create policy "Meeting participants updatable by self or host/manager"
  on public.meeting_participants for update
  to authenticated
  using (
    employee_id = auth.uid()
    or employee_id = public.current_profile_id()
    or employee_id in (select id from public.profiles where user_id = auth.uid() or id = auth.uid())
    or meeting_id in (
      select id from public.meetings 
      where created_by = auth.uid() 
         or created_by = public.current_profile_id() 
         or created_by in (select id from public.profiles where user_id = auth.uid() or id = auth.uid())
    )
    or public.is_manager()
  )
  with check (true);

create policy "Meeting participants deletable by self or host/manager"
  on public.meeting_participants for delete
  to authenticated
  using (
    employee_id = auth.uid()
    or employee_id = public.current_profile_id()
    or employee_id in (select id from public.profiles where user_id = auth.uid() or id = auth.uid())
    or meeting_id in (
      select id from public.meetings 
      where created_by = auth.uid() 
         or created_by = public.current_profile_id() 
         or created_by in (select id from public.profiles where user_id = auth.uid() or id = auth.uid())
    )
    or public.is_manager()
  );

-- 13. Notifications
drop policy if exists "Notifications viewable and manageable by owner" on public.notifications;
drop policy if exists "Notifications select policy" on public.notifications;
drop policy if exists "Notifications insert policy" on public.notifications;
drop policy if exists "Notifications update policy" on public.notifications;
drop policy if exists "Notifications delete policy" on public.notifications;

create policy "Notifications select policy"
  on public.notifications for select
  to authenticated
  using (
    employee_id in (select id from public.profiles where user_id = auth.uid() or id = auth.uid())
    or public.is_manager()
  );

create policy "Notifications insert policy"
  on public.notifications for insert
  to authenticated
  with check (true);

create policy "Notifications update policy"
  on public.notifications for update
  to authenticated
  using (
    employee_id in (select id from public.profiles where user_id = auth.uid() or id = auth.uid())
    or public.is_manager()
  );

create policy "Notifications delete policy"
  on public.notifications for delete
  to authenticated
  using (
    employee_id in (select id from public.profiles where user_id = auth.uid() or id = auth.uid())
    or public.is_admin()
  );

-- 14. Holidays
drop policy if exists "Holidays viewable by authenticated" on public.holidays;
create policy "Holidays viewable by authenticated"
  on public.holidays for select
  to authenticated
  using (true);

drop policy if exists "Holidays manageable by admin" on public.holidays;
create policy "Holidays manageable by admin"
  on public.holidays for all
  to authenticated
  using (public.is_admin());

-- 15. Audit Logs
drop policy if exists "Audit logs viewable by admin" on public.audit_logs;
create policy "Audit logs viewable by admin"
  on public.audit_logs for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- STEP 6: GRANTS & DEFAULT PERMISSIONS
-- ---------------------------------------------------------------------

grant all on all tables in schema public to postgres, anon, authenticated, service_role, supabase_auth_admin, authenticator;
grant all on all sequences in schema public to postgres, anon, authenticated, service_role, supabase_auth_admin, authenticator;
grant all on all routines in schema public to postgres, anon, authenticated, service_role, supabase_auth_admin, authenticator;

-- ---------------------------------------------------------------------
-- STEP 7: SECURE EMPLOYEE ONBOARDING RPC FUNCTION
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
-- STEP 8: SEED DEPARTMENTS, DESIGNATIONS, LEAVE TYPES & SUPER ADMIN
-- ---------------------------------------------------------------------

-- Seed Core Departments
insert into public.departments (id, name, code, description) values
    ('d0000000-0000-0000-0000-000000000001', 'Engineering', 'ENG-101', 'Software development and technical infrastructure'),
    ('d0000000-0000-0000-0000-000000000002', 'Product & Design', 'PRD-102', 'Product management and UI/UX design'),
    ('d0000000-0000-0000-0000-000000000003', 'Marketing', 'MKT-103', 'Brand growth and market campaigns'),
    ('d0000000-0000-0000-0000-000000000004', 'Human Resources', 'HR-104', 'Talent acquisition, employee care and operations'),
    ('d0000000-0000-0000-0000-000000000005', 'Finance', 'FIN-105', 'Financial planning and corporate payroll'),
    ('d0000000-0000-0000-0000-000000000006', 'Operations', 'OPS-106', 'Business administration and internal processes')
on conflict (name) do update 
set code = excluded.code, description = excluded.description;

-- Seed Standard Designations dynamically linked to department IDs
insert into public.designations (title, department_id, level) values
    ('Chief Technology Officer & Founder', (select id from public.departments where name = 'Engineering' limit 1), 'Executive'),
    ('Engineering Lead', (select id from public.departments where name = 'Engineering' limit 1), 'Lead'),
    ('Senior Full Stack Developer', (select id from public.departments where name = 'Engineering' limit 1), 'Senior'),
    ('Full Stack Developer', (select id from public.departments where name = 'Engineering' limit 1), 'Mid'),
    ('Frontend Developer', (select id from public.departments where name = 'Engineering' limit 1), 'Mid'),
    ('Backend Developer', (select id from public.departments where name = 'Engineering' limit 1), 'Mid'),
    ('UI/UX Designer', (select id from public.departments where name = 'Product & Design' limit 1), 'Mid'),
    ('Product Manager', (select id from public.departments where name = 'Product & Design' limit 1), 'Lead'),
    ('HR Manager', (select id from public.departments where name = 'Human Resources' limit 1), 'Lead'),
    ('QA Engineer', (select id from public.departments where name = 'Engineering' limit 1), 'Mid')
on conflict (title) do update 
set department_id = excluded.department_id, level = excluded.level;

-- Seed Standard Leave Types
insert into public.leave_types (id, name, code, default_days, is_paid, description) values
    ('b0000000-0000-0000-0000-000000000001', 'Casual Leave', 'CL', 12, true, 'Paid casual leave for personal matters'),
    ('b0000000-0000-0000-0000-000000000002', 'Sick Leave', 'SL', 8, true, 'Paid leave for medical recovery'),
    ('b0000000-0000-0000-0000-000000000003', 'Earned Leave', 'EL', 15, true, 'Accrued annual vacation leave'),
    ('b0000000-0000-0000-0000-000000000004', 'Unpaid Leave', 'LWP', 0, false, 'Leave without pay')
on conflict (name) do update 
set code = excluded.code, default_days = excluded.default_days, is_paid = excluded.is_paid;

-- Seed Super Admin Account in auth.users and public.profiles
do $$
declare
  admin_uid uuid := 'a0000000-0000-0000-0000-000000000001';
  v_eng_dept_id uuid;
  v_cto_desig_id uuid;
begin
  select id into v_eng_dept_id from public.departments where name = 'Engineering' limit 1;
  select id into v_cto_desig_id from public.designations where title = 'Chief Technology Officer & Founder' limit 1;

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
    v_eng_dept_id,
    v_cto_desig_id,
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
      department_id = coalesce(v_eng_dept_id, public.profiles.department_id),
      designation_id = coalesce(v_cto_desig_id, public.profiles.designation_id),
      updated_at = now();
end;
$$;

-- ---------------------------------------------------------------------
-- STEP 9: NOTIFY SUPABASE API ENGINE
-- ---------------------------------------------------------------------

notify pgrst, 'reload schema';
