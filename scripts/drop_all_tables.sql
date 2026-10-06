-- =====================================================================
-- TCY One — COMPLETE DATABASE DROP & CLEANUP SCRIPT
-- WARNING: This will drop all tables, triggers, and functions in public schema
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New query)
-- =====================================================================

-- 1. Drop all triggers on auth.users
drop trigger if exists on_auth_user_created on auth.users cascade;

-- 2. Drop all functions in public schema
drop function if exists public.handle_new_user() cascade;
drop function if exists public.create_employee_account cascade;
drop function if exists public.create_employee_account(text, text, text, text, text, text, text) cascade;
drop function if exists public.create_employee_account(text, text, text, text, text, text, text, text) cascade;
drop function if exists public.current_profile_id cascade;
drop function if exists public.is_super_admin cascade;
drop function if exists public.is_admin cascade;
drop function if exists public.is_manager cascade;

-- 3. Drop all tables in public schema in reverse dependency order
drop table if exists public.task_comments cascade;
drop table if exists public.tasks cascade;
drop table if exists public.project_members cascade;
drop table if exists public.projects cascade;
drop table if exists public.meeting_participants cascade;
drop table if exists public.meetings cascade;
drop table if exists public.standup_responses cascade;
drop table if exists public.standups cascade;
drop table if exists public.attendance_corrections cascade;
drop table if exists public.attendance cascade;
drop table if exists public.leave_requests cascade;
drop table if exists public.leave_types cascade;
drop table if exists public.notifications cascade;
drop table if exists public.audit_logs cascade;
drop table if exists public.holidays cascade;
drop table if exists public.profiles cascade;
drop table if exists public.designations cascade;
drop table if exists public.departments cascade;

-- 4. Clean up any leftover auth users and identities (Optional: cleans up all test users)
delete from auth.identities;
delete from auth.users;

-- 5. Reload Supabase Schema Cache
notify pgrst, 'reload schema';
