-- ==============================================================================
-- TCY WORKHUB: AUTOMATED DATABASE TRIGGER FOR SERVER-SIDE PUSH NOTIFICATIONS
-- ==============================================================================
-- This trigger automatically calls the `send-push` Edge Function whenever a new
-- record is inserted into the `notifications` table, ensuring Windows & macOS
-- Notification Center alerts arrive even if the browser tab is completely closed!
-- ==============================================================================

-- 1. Enable pg_net extension for asynchronous HTTP requests from PostgreSQL
create extension if not exists pg_net with schema extensions;

-- 2. Function to invoke send-push Edge Function via pg_net
create or replace function public.trigger_send_push_notification()
returns trigger as $$
declare
  project_url text := 'https://vsyajapuobqbvsrveqnz.supabase.co/functions/v1/send-push';
  payload jsonb;
begin
  payload := jsonb_build_object(
    'employee_id', new.employee_id,
    'title', new.title,
    'body', new.message,
    'url', coalesce(new.action_url, '/'),
    'tag', coalesce(new.id::text, 'tcy-notif')
  );

  -- Perform async HTTP POST to Edge Function
  perform extensions.http_post(
    url := project_url,
    body := payload::text,
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    )
  );

  return new;
exception when others then
  -- Do not block database transactions if push dispatch fails
  return new;
end;
$$ language plpgsql security definer;

-- 3. Attach trigger to notifications table
drop trigger if exists on_notification_created_push on public.notifications;
create trigger on_notification_created_push
  after insert on public.notifications
  for each row
  execute function public.trigger_send_push_notification();

-- Verification
select 'Automated push trigger successfully installed on notifications table' as status;
