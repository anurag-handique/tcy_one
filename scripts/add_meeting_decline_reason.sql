-- Add decline_reason column to meeting_participants table if not exists
alter table if exists public.meeting_participants 
add column if not exists decline_reason text;
