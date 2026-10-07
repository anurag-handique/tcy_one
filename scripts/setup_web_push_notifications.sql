-- ==============================================================================
-- TCY WORKHUB: WEB PUSH NOTIFICATIONS & DEVICE SUBSCRIPTION DATABASE SETUP
-- ==============================================================================
-- Purpose:
--   Supports W3C Web Push & native desktop notification delivery on Windows 10/11
--   and macOS (Ventura+ Safari, Chrome, Edge, Firefox).
-- ==============================================================================

-- 1. Create push_subscriptions table
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  platform text default 'windows', -- 'windows' | 'macos' | 'linux' | 'ios' | 'android' | 'other'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Indexes for instant lookup during notification dispatch
create index if not exists idx_push_subs_employee_id on public.push_subscriptions(employee_id);
create index if not exists idx_push_subs_platform on public.push_subscriptions(platform);

-- 3. Auto-update timestamp trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_push_subs_updated_at on public.push_subscriptions;
create trigger set_push_subs_updated_at
  before update on public.push_subscriptions
  for each row
  execute function public.handle_updated_at();

-- 4. Row Level Security (RLS)
alter table public.push_subscriptions enable row level security;

-- Drop old policies if any exist
drop policy if exists "Users can view their own push subscriptions" on public.push_subscriptions;
drop policy if exists "Users can insert their own push subscriptions" on public.push_subscriptions;
drop policy if exists "Users can update their own push subscriptions" on public.push_subscriptions;
drop policy if exists "Users can delete their own push subscriptions" on public.push_subscriptions;
drop policy if exists "Admins can manage all push subscriptions" on public.push_subscriptions;

-- Policy 1: SELECT
create policy "Users can view their own push subscriptions"
  on public.push_subscriptions for select
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

-- Policy 2: INSERT
create policy "Users can insert their own push subscriptions"
  on public.push_subscriptions for insert
  to authenticated
  with check (
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

-- Policy 3: UPDATE
create policy "Users can update their own push subscriptions"
  on public.push_subscriptions for update
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
  )
  with check (
    employee_id in (
      select id from public.profiles
      where user_id = auth.uid() or id = auth.uid()
    )
  );

-- Policy 4: DELETE
create policy "Users can delete their own push subscriptions"
  on public.push_subscriptions for delete
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

-- Verification Query
select 'push_subscriptions table & RLS policies successfully initialized' as status;
