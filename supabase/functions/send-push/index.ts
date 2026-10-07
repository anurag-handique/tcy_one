// ==============================================================================
// SUPABASE EDGE FUNCTION: DISPATCH WEB PUSH NOTIFICATIONS
// ==============================================================================
// Dispatches encrypted W3C Web Push payloads using VAPID authentication
// to APNs (macOS Safari), FCM (Windows/Mac Chrome & Edge), and Mozilla push services.
// ==============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configure VAPID Keys from Environment Secrets
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:info@thecodeyogi.com';


if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { employee_id, title, body, url, tag, data } = await req.json();

    if (!employee_id || !title) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: employee_id, title' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch all registered desktop & mobile push subscriptions for this employee
    const { data: subscriptions, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('employee_id', employee_id);

    if (fetchError) {
      throw fetchError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No registered push subscriptions for this employee.', dispatchedCount: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Prepare standardized JSON payload for Service Worker
    const payload = JSON.stringify({
      title: title || 'TCY WorkHub Notification',
      body: body || 'You have an update in your workspace.',
      url: url || '/',
      tag: tag || `tcy-${Date.now()}`,
      data: data || {},
    });

    const expiredEndpoints: string[] = [];
    const dispatchResults = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          };
          return await webpush.sendNotification(pushSubscription, payload);
        } catch (err: any) {
          // If subscription expired / unsubscribed (HTTP 404 or 410 Gone), collect for cleanup
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            expiredEndpoints.push(sub.endpoint);
          }
          throw err;
        }
      })
    );

    // 3. Clean up any expired endpoints from PostgreSQL
    if (expiredEndpoints.length > 0) {
      await supabase.from('push_subscriptions').delete().in('endpoint', expiredEndpoints);
    }

    const successful = dispatchResults.filter((r) => r.status === 'fulfilled').length;

    return new Response(
      JSON.stringify({
        success: true,
        dispatchedCount: successful,
        totalEndpoints: subscriptions.length,
        cleanedUpExpiredCount: expiredEndpoints.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Internal Server Error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
