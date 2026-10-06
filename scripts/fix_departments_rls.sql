-- ==============================================================================
-- TCY One: Fix Row Level Security (RLS) Policies for Departments & Designations
-- ==============================================================================
-- Run this in your Supabase SQL Editor to resolve RLS 42501 (403 Forbidden) errors.

-- 1. Enable RLS on departments & designations
alter table if exists public.departments enable row level security;
alter table if exists public.designations enable row level security;

-- 2. Drop all conflicting policies on departments
drop policy if exists "View departments" on public.departments;
drop policy if exists "Manage departments" on public.departments;
drop policy if exists "Super admin manage departments" on public.departments;
drop policy if exists "Allow all insert departments" on public.departments;
drop policy if exists "Allow all authenticated users to view departments" on public.departments;
drop policy if exists "Allow authenticated users and super admin to insert departments" on public.departments;
drop policy if exists "Allow authenticated users and super admin to update departments" on public.departments;
drop policy if exists "Allow authenticated users and super admin to delete departments" on public.departments;
drop policy if exists "Enable all access for departments" on public.departments;

-- 3. Create unrestricted policies for departments (authenticated and anon)
create policy "Enable select for all on departments"
    on public.departments for select
    to public
    using (true);

create policy "Enable insert for all on departments"
    on public.departments for insert
    to public
    with check (true);

create policy "Enable update for all on departments"
    on public.departments for update
    to public
    using (true)
    with check (true);

create policy "Enable delete for all on departments"
    on public.departments for delete
    to public
    using (true);

-- 4. Drop all conflicting policies on designations
drop policy if exists "View designations" on public.designations;
drop policy if exists "Manage designations" on public.designations;
drop policy if exists "Allow all authenticated users to view designations" on public.designations;
drop policy if exists "Allow authenticated to insert designations" on public.designations;
drop policy if exists "Allow authenticated to update designations" on public.designations;
drop policy if exists "Enable all access for designations" on public.designations;

-- 5. Create unrestricted policies for designations (authenticated and anon)
create policy "Enable select for all on designations"
    on public.designations for select
    to public
    using (true);

create policy "Enable insert for all on designations"
    on public.designations for insert
    to public
    with check (true);

create policy "Enable update for all on designations"
    on public.designations for update
    to public
    using (true)
    with check (true);

create policy "Enable delete for all on designations"
    on public.designations for delete
    to public
    using (true);
