-- =====================================================================
-- COMPLETE RLS POLICIES FOR MEETINGS & MEETING PARTICIPANTS
-- Allows:
-- 1. Any employee can schedule meetings and invite squad participants
-- 2. Meeting creator (or Manager/Admin) can EDIT / UPDATE their meetings
-- 3. Meeting creator (or Manager/Admin) can DELETE their meetings
-- 4. Invited employees can accept / decline with comments (update RSVP)
-- =====================================================================

-- Step 1: Ensure decline_reason column exists
alter table if exists public.meeting_participants
add column if not exists decline_reason text;

-- Step 2: Ensure RLS is enabled
alter table public.meetings enable row level security;
alter table public.meeting_participants enable row level security;

-- Step 3: Helper Functions Check (if not already defined)
create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select id from public.profiles where user_id = auth.uid() or id = auth.uid() limit 1;
$$;

create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(
    (select role from public.profiles where user_id = auth.uid() or id = auth.uid() limit 1),
    coalesce(auth.jwt()->'user_metadata'->>'role', 'employee')
  ) in ('manager', 'admin', 'super_admin');
$$;

grant execute on function public.current_profile_id to authenticated, anon;
grant execute on function public.is_manager to authenticated, anon;

-- =====================================================================
-- POLICIES FOR public.meetings
-- =====================================================================

-- Drop existing meeting policies
drop policy if exists "Meetings viewable by authenticated" on public.meetings;
drop policy if exists "Meetings insertable by authenticated" on public.meetings;
drop policy if exists "Meetings updatable by creator or manager/admin" on public.meetings;
drop policy if exists "Meetings deletable by creator or manager/admin" on public.meetings;
drop policy if exists "Meetings manageable by creator, manager, admin" on public.meetings;
drop policy if exists "Manage meetings" on public.meetings;
drop policy if exists "View meetings" on public.meetings;

-- 1. SELECT: View all meetings
create policy "Meetings viewable by authenticated"
  on public.meetings for select
  to authenticated
  using (true);

-- 2. INSERT: Any authenticated user can create/schedule a meeting
create policy "Meetings insertable by authenticated"
  on public.meetings for insert
  to authenticated
  with check (true);

-- 3. UPDATE: Meeting creator OR manager/admin can edit/update
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

-- 4. DELETE: Meeting creator OR manager/admin can delete
create policy "Meetings deletable by creator or manager/admin"
  on public.meetings for delete
  to authenticated
  using (
    created_by = auth.uid()
    or created_by = public.current_profile_id()
    or created_by in (select id from public.profiles where user_id = auth.uid() or id = auth.uid())
    or public.is_manager()
  );

-- =====================================================================
-- POLICIES FOR public.meeting_participants
-- =====================================================================

-- Drop existing meeting_participants policies
drop policy if exists "Meeting participants viewable by authenticated" on public.meeting_participants;
drop policy if exists "Meeting participants insertable by authenticated" on public.meeting_participants;
drop policy if exists "Meeting participants updatable by self or host/manager" on public.meeting_participants;
drop policy if exists "Meeting participants deletable by self or host/manager" on public.meeting_participants;
drop policy if exists "Meeting participants manageable by meeting owner or self" on public.meeting_participants;
drop policy if exists "Manage meeting participants" on public.meeting_participants;
drop policy if exists "View meeting participants" on public.meeting_participants;

-- 1. SELECT: View participants
create policy "Meeting participants viewable by authenticated"
  on public.meeting_participants for select
  to authenticated
  using (true);

-- 2. INSERT: Any authenticated user can add invitees/participants
create policy "Meeting participants insertable by authenticated"
  on public.meeting_participants for insert
  to authenticated
  with check (true);

-- 3. UPDATE: Invitee (RSVP status & reason) OR Meeting Creator OR Manager/Admin can update
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

-- 4. DELETE: Invitee, Meeting Creator OR Manager/Admin can delete participant records
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
