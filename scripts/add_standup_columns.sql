-- ================================================================
-- MIGRATION: Standup Schema & RBAC / RLS Policies for Managers & Super Admins
-- Run this in Supabase SQL Editor to enable Super Admins, Admins, & Managers
-- to update meet links, times, cutoff thresholds, and manage standups.
-- ================================================================

-- 1. Ensure required columns exist on standups
ALTER TABLE IF EXISTS public.standups 
  ADD COLUMN IF NOT EXISTS meeting_url text DEFAULT 'https://meet.google.com/tcy-daily-sync',
  ADD COLUMN IF NOT EXISTS cutoff_time text DEFAULT '10:30',
  ADD COLUMN IF NOT EXISTS meeting_time text DEFAULT '11:00';

-- 2. Ensure status column exists on standup_responses
ALTER TABLE IF EXISTS public.standup_responses 
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'late', 'missed'));

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.standups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.standup_responses ENABLE ROW LEVEL SECURITY;

-- 4. Clean up any existing standup policies
DROP POLICY IF EXISTS "Standups viewable by authenticated" ON public.standups;
DROP POLICY IF EXISTS "Standups manageable by manager or admin" ON public.standups;
DROP POLICY IF EXISTS "Standups insertable by manager or admin" ON public.standups;
DROP POLICY IF EXISTS "Standups updateable by manager or admin" ON public.standups;
DROP POLICY IF EXISTS "Standups deletable by manager or admin" ON public.standups;
DROP POLICY IF EXISTS "Manage standups" ON public.standups;
DROP POLICY IF EXISTS "View standups" ON public.standups;

-- 5. STANDUPS POLICIES:
-- 5a. All authenticated users can view standup meetings
CREATE POLICY "Standups viewable by authenticated"
  ON public.standups FOR SELECT
  TO authenticated
  USING (true);

-- 5b. Super Admins, Admins, and Managers can insert/create standups
CREATE POLICY "Standups insertable by manager or admin"
  ON public.standups FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_manager() 
    OR public.is_admin() 
    OR public.is_super_admin()
    OR (auth.jwt()->'user_metadata'->>'role') IN ('manager', 'admin', 'super_admin')
    OR created_by = public.current_profile_id()
  );

-- 5c. Super Admins, Admins, and Managers can change meeting links, cutoff times, and settings
CREATE POLICY "Standups updateable by manager or admin"
  ON public.standups FOR UPDATE
  TO authenticated
  USING (
    public.is_manager() 
    OR public.is_admin() 
    OR public.is_super_admin()
    OR (auth.jwt()->'user_metadata'->>'role') IN ('manager', 'admin', 'super_admin')
    OR created_by = public.current_profile_id()
  )
  WITH CHECK (
    public.is_manager() 
    OR public.is_admin() 
    OR public.is_super_admin()
    OR (auth.jwt()->'user_metadata'->>'role') IN ('manager', 'admin', 'super_admin')
    OR created_by = public.current_profile_id()
  );

-- 5d. Super Admins, Admins, and Managers can delete standups
CREATE POLICY "Standups deletable by manager or admin"
  ON public.standups FOR DELETE
  TO authenticated
  USING (
    public.is_manager() 
    OR public.is_admin() 
    OR public.is_super_admin()
    OR (auth.jwt()->'user_metadata'->>'role') IN ('manager', 'admin', 'super_admin')
  );

-- 6. STANDUP RESPONSES POLICIES:
DROP POLICY IF EXISTS "Standup responses viewable by authenticated" ON public.standup_responses;
DROP POLICY IF EXISTS "Standup responses insertable by employee" ON public.standup_responses;
DROP POLICY IF EXISTS "Standup responses updateable by employee or manager" ON public.standup_responses;
DROP POLICY IF EXISTS "View standup responses" ON public.standup_responses;
DROP POLICY IF EXISTS "Submit standup responses" ON public.standup_responses;
DROP POLICY IF EXISTS "Update standup responses" ON public.standup_responses;

CREATE POLICY "Standup responses viewable by authenticated"
  ON public.standup_responses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Standup responses insertable by employee"
  ON public.standup_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id = public.current_profile_id() 
    OR public.is_manager()
    OR (auth.jwt()->'user_metadata'->>'role') IN ('manager', 'admin', 'super_admin')
  );

CREATE POLICY "Standup responses updateable by employee or manager"
  ON public.standup_responses FOR UPDATE
  TO authenticated
  USING (
    employee_id = public.current_profile_id()
    OR public.is_manager()
    OR (auth.jwt()->'user_metadata'->>'role') IN ('manager', 'admin', 'super_admin')
  )
  WITH CHECK (
    employee_id = public.current_profile_id()
    OR public.is_manager()
    OR (auth.jwt()->'user_metadata'->>'role') IN ('manager', 'admin', 'super_admin')
  );

-- 7. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
