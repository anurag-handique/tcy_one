-- ==============================================================================
-- TCY WORKHUB: DATABASE SCHEMA MIGRATION FIX
-- 1. Add break_start and break_minutes columns to public.attendance table
-- 2. Update notifications_type_check constraint to permit 'attendance' & 'sprint'
-- ==============================================================================

-- 1. Ensure break tracking columns exist in public.attendance
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'attendance' and column_name = 'break_start'
  ) then
    alter table public.attendance add column break_start timestamptz default null;
  end if;

  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'attendance' and column_name = 'break_minutes'
  ) then
    alter table public.attendance add column break_minutes integer default 0;
  end if;
end $$;

-- 2. Update notifications type check constraint
do $$
begin
  -- Drop existing constraint if present
  alter table public.notifications drop constraint if exists notifications_type_check;

  -- Re-create constraint allowing all application notification types
  alter table public.notifications add constraint notifications_type_check 
    check (type in ('info', 'success', 'warning', 'error', 'task', 'leave', 'standup', 'meeting', 'attendance', 'sprint'));
end $$;

-- 3. Reload schema cache for PostgREST
notify pgrst, 'reload schema';

select 'Attendance columns and Notifications type constraint successfully updated' as status;
