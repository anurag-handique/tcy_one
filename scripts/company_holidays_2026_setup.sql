-- ==============================================================================
-- OFFICIAL 2026 COMPANY HOLIDAYS SETUP & RLS PERMISSIONS
-- ==============================================================================
-- This script creates/updates the public.holidays table, configures RLS policies
-- allowing Super Admins & Admins to add/edit/delete holidays, and seeds the
-- official 2026 Gazetted and Optional Company Holidays.
-- ==============================================================================

-- 1. Create table if not exists
create table if not exists public.holidays (
  id text primary key default ('hol-' || extract(epoch from now())::text),
  name text not null,
  holiday_date date not null unique,
  is_optional boolean default false,
  description text,
  year integer not null default 2026,
  created_at timestamp with time zone default now()
);

-- 2. Enable Row-Level Security
alter table public.holidays enable row level security;

-- 3. Drop existing policies to prevent conflicts
drop policy if exists "Holidays viewable by authenticated" on public.holidays;
drop policy if exists "Holidays manageable by admin" on public.holidays;
drop policy if exists "Holidays select policy" on public.holidays;
drop policy if exists "Holidays insert policy" on public.holidays;
drop policy if exists "Holidays update policy" on public.holidays;
drop policy if exists "Holidays delete policy" on public.holidays;

-- 4. SELECT: All authenticated employees can view company holidays
create policy "Holidays select policy"
  on public.holidays for select
  to authenticated
  using (true);

-- 5. INSERT: Super Admins and Admins can create company holidays
create policy "Holidays insert policy"
  on public.holidays for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where (user_id = auth.uid() or id = auth.uid())
        and role in ('admin', 'super_admin')
    )
  );

-- 6. UPDATE: Super Admins and Admins can update company holidays
create policy "Holidays update policy"
  on public.holidays for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where (user_id = auth.uid() or id = auth.uid())
        and role in ('admin', 'super_admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where (user_id = auth.uid() or id = auth.uid())
        and role in ('admin', 'super_admin')
    )
  );

-- 7. DELETE: Super Admins and Admins can delete company holidays
create policy "Holidays delete policy"
  on public.holidays for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where (user_id = auth.uid() or id = auth.uid())
        and role in ('admin', 'super_admin')
    )
  );

-- 8. Seed Official 2026 Company Holidays
insert into public.holidays (id, name, holiday_date, is_optional, description, year)
values
  ('hol-2026-01', 'New Year''s Day', '2026-01-01', false, 'First day of the year 2026', 2026),
  ('hol-2026-02', 'Republic Day', '2026-01-26', false, 'National Holiday celebrating the Constitution of India', 2026),
  ('hol-2026-03', 'Maha Shivratri', '2026-02-15', true, 'Great Night of Shiva', 2026),
  ('hol-2026-04', 'Holi', '2026-03-04', false, 'Festival of Colors', 2026),
  ('hol-2026-05', 'Eid-ul-Fitr', '2026-03-20', false, 'Islamic festival marking the end of Ramadan', 2026),
  ('hol-2026-06', 'Good Friday', '2026-04-03', false, 'Christian holy day commemorating the crucifixion of Jesus', 2026),
  ('hol-2026-07', 'Dr. B.R. Ambedkar Jayanti', '2026-04-14', false, 'Commemorating the father of the Constitution of India', 2026),
  ('hol-2026-08', 'International Workers'' Day', '2026-05-01', false, 'Labor Day celebration for working professionals', 2026),
  ('hol-2026-09', 'Eid-ul-Adha (Bakrid)', '2026-05-27', false, 'Feast of the Sacrifice', 2026),
  ('hol-2026-10', 'Independence Day', '2026-08-15', false, 'National Holiday celebrating Indian Independence', 2026),
  ('hol-2026-11', 'Raksha Bandhan', '2026-08-26', true, 'Celebration of brotherly and sisterly bonding', 2026),
  ('hol-2026-12', 'Janmashtami', '2026-09-04', true, 'Birth of Lord Krishna', 2026),
  ('hol-2026-13', 'Mahatma Gandhi Jayanti', '2026-10-02', false, 'National Holiday commemorating the Father of the Nation', 2026),
  ('hol-2026-14', 'Dussehra (Vijayadashami)', '2026-10-20', false, 'Victory of Good over Evil', 2026),
  ('hol-2026-15', 'Diwali (Deepavali)', '2026-11-08', false, 'Festival of Lights', 2026),
  ('hol-2026-16', 'Guru Nanak Jayanti', '2026-11-24', false, 'Birth of Guru Nanak Dev Ji', 2026),
  ('hol-2026-17', 'Christmas Day', '2026-12-25', false, 'Celebration of the birth of Jesus Christ', 2026)
on conflict (holiday_date) do update
set
  name = excluded.name,
  is_optional = excluded.is_optional,
  description = excluded.description,
  year = excluded.year;
