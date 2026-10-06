-- ==============================================================================
-- FIX NOTIFICATIONS RLS POLICIES
-- ==============================================================================
-- Resolves error: "new row violates row-level security policy for table notifications" (Code 42501)
-- Cause: Previous policy was `FOR ALL USING (employee_id = current_profile_id())`,
-- which blocked User A from inserting notifications intended for User B (e.g. meeting invites, RSVP replies).
-- ==============================================================================

alter table public.notifications enable row level security;

-- Drop all old policies
drop policy if exists "Users view their own notifications" on public.notifications;
drop policy if exists "Update notifications" on public.notifications;
drop policy if exists "Notifications viewable and manageable by owner" on public.notifications;
drop policy if exists "Notifications select policy" on public.notifications;
drop policy if exists "Notifications insert policy" on public.notifications;
drop policy if exists "Notifications update policy" on public.notifications;
drop policy if exists "Notifications delete policy" on public.notifications;

-- 1. SELECT: Users view their own notifications, managers/admins can view all
create policy "Notifications select policy"
  on public.notifications for select
  to authenticated
  using (
    employee_id in (
      select id from public.profiles
      where user_id = auth.uid() or id = auth.uid()
    )
    or exists (
      select 1 from public.profiles
      where (user_id = auth.uid() or id = auth.uid())
        and role in ('manager', 'admin', 'super_admin')
    )
  );

-- 2. INSERT: Any authenticated user can create/dispatch a notification to any employee
create policy "Notifications insert policy"
  on public.notifications for insert
  to authenticated
  with check (true);

-- 3. UPDATE: Users can mark as read / update their own notifications
create policy "Notifications update policy"
  on public.notifications for update
  to authenticated
  using (
    employee_id in (
      select id from public.profiles
      where user_id = auth.uid() or id = auth.uid()
    )
    or exists (
      select 1 from public.profiles
      where (user_id = auth.uid() or id = auth.uid())
        and role in ('manager', 'admin', 'super_admin')
    )
  )
  with check (
    employee_id in (
      select id from public.profiles
      where user_id = auth.uid() or id = auth.uid()
    )
    or exists (
      select 1 from public.profiles
      where (user_id = auth.uid() or id = auth.uid())
        and role in ('manager', 'admin', 'super_admin')
    )
  );

-- 4. DELETE: Users can delete their own notifications or admins can delete
create policy "Notifications delete policy"
  on public.notifications for delete
  to authenticated
  using (
    employee_id in (
      select id from public.profiles
      where user_id = auth.uid() or id = auth.uid()
    )
    or exists (
      select 1 from public.profiles
      where (user_id = auth.uid() or id = auth.uid())
        and role in ('admin', 'super_admin')
    )
  );
