-- =====================================================================
-- TCY One — CREATE TABLES ONLY (Clean Schema Setup)
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New query)
-- =====================================================================

-- 1. Enable Required Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto" with schema extensions;

-- 2. Schema Usage Grants
grant usage on schema public to postgres, anon, authenticated, service_role, supabase_auth_admin, authenticator;
grant usage on schema auth to postgres, supabase_auth_admin, authenticator;

-- 3. Create Tables

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

-- 3. Profiles / Employees
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

-- Add manager foreign key on departments
alter table public.departments 
    drop constraint if exists fk_departments_manager,
    add constraint fk_departments_manager foreign key (manager_id) references public.profiles(id) on delete set null;

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

-- 4. Full Permission Grants & Default Privileges
grant all on all tables in schema public to postgres, anon, authenticated, service_role, supabase_auth_admin, authenticator;
grant all on all sequences in schema public to postgres, anon, authenticated, service_role, supabase_auth_admin, authenticator;
grant all on all routines in schema public to postgres, anon, authenticated, service_role, supabase_auth_admin, authenticator;

grant all on all tables in schema auth to postgres, supabase_auth_admin;
grant all on all sequences in schema auth to postgres, supabase_auth_admin;
grant all on all routines in schema auth to postgres, supabase_auth_admin;

alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role, supabase_auth_admin, authenticator;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role, supabase_auth_admin, authenticator;
alter default privileges in schema public grant all on routines to postgres, anon, authenticated, service_role, supabase_auth_admin, authenticator;

-- 5. Reload Supabase Schema Cache
notify pgrst, 'reload schema';
