-- Migration to ensure punch location columns exist in public.attendance
alter table public.attendance 
  add column if not exists punch_in_location text,
  add column if not exists punch_out_location text,
  add column if not exists overtime_hours numeric(5,2) default 0;

-- Refresh Supabase schema cache
notify pgrst, 'reload schema';
