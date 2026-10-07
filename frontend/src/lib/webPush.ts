// ==============================================================================
// TCY WORKHUB: W3C WEB PUSH & OS DESKTOP NOTIFICATION MANAGER
// ==============================================================================

import { supabase } from './supabase';
import { playNotificationSound } from './desktopNotification';

// Default VAPID Public Key (Overridable via VITE_VAPID_PUBLIC_KEY in .env)
export const DEFAULT_VAPID_PUBLIC_KEY =
  (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY ||
  'BH4U7EH40GwUUoUP0gpLdIdQrIy6pXPRtQwJ6xNZha23jdeYEVFWgkdkJ052NfP63N6cdYFcu8l8O8sFAsFqbvc';


/**
 * Detect client operating system
 */
export function detectClientPlatform(): 'windows' | 'macos' | 'linux' | 'ios' | 'android' | 'other' {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent.toLowerCase();
  const platform = (navigator as any).userAgentData?.platform?.toLowerCase() || navigator.platform?.toLowerCase() || '';

  if (ua.includes('win') || platform.includes('win')) return 'windows';
  if (ua.includes('mac') || platform.includes('mac')) return 'macos';
  if (ua.includes('linux') || platform.includes('linux')) return 'linux';
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) return 'ios';
  if (ua.includes('android')) return 'android';
  return 'other';
}

/**
 * Check if the current browser and OS support Service Worker Web Push
 */
export function isWebPushSupported(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * Convert standard base64 URL VAPID string into Uint8Array buffer
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Register the Service Worker in the browser
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    return reg;
  } catch (err) {
    console.warn('[WebPush] Service Worker registration failed:', err);
    return null;
  }
}

/**
 * Get active browser push subscription if already registered
 */
export async function getActivePushSubscription(): Promise<PushSubscription | null> {
  if (!isWebPushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  } catch (err) {
    console.warn('[WebPush] Failed to check active subscription:', err);
    return null;
  }
}

/**
 * Subscribe user to Web Push and save token to Supabase `push_subscriptions`
 */
export async function subscribeToPush(
  employeeId: string,
  vapidPublicKey: string = DEFAULT_VAPID_PUBLIC_KEY
): Promise<{ success: boolean; subscription?: PushSubscription; error?: string }> {
  if (!isWebPushSupported()) {
    return {
      success: false,
      error: 'Web Push is not supported in this browser or environment.',
    };
  }

  try {
    // 1. Request Notification permission if not already granted
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        success: false,
        error: `Notification permission denied (${permission}). Please allow notifications in browser/OS settings.`,
      };
    }

    // 2. Ensure Service Worker is registered and active
    const registration = await navigator.serviceWorker.ready;

    // 3. Get existing or create new push subscription
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      try {
        const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey as unknown as BufferSource,
        });
      } catch (subErr: any) {
        // If VAPID key is demo/invalid, subscription might throw in strict browser
        console.warn('[WebPush] VAPID subscribe error:', subErr);
        return {
          success: false,
          error: `Browser push subscription error: ${subErr?.message || 'Invalid VAPID public key'}`,
        };
      }
    }

    const subJson = subscription.toJSON();
    const platform = detectClientPlatform();

    // 4. Save to Supabase push_subscriptions table if supabase configured
    if (supabase) {
      const { error: dbError } = await supabase.from('push_subscriptions').upsert(
        {
          employee_id: employeeId,
          endpoint: subscription.endpoint,
          p256dh: subJson.keys?.p256dh || '',
          auth: subJson.keys?.auth || '',
          user_agent: navigator.userAgent,
          platform: platform,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' }
      );

      if (dbError) {
        console.warn('[WebPush] Supabase save error (table may need setup):', dbError);
      }
    }

    // Play subtle confirmation chime
    playNotificationSound();

    return {
      success: true,
      subscription,
    };
  } catch (err: any) {
    console.error('[WebPush] Subscription error:', err);
    return {
      success: false,
      error: err?.message || 'Failed to subscribe to push service.',
    };
  }
}

/**
 * Unsubscribe current browser device from Web Push and remove from Supabase
 */
export async function unsubscribeFromPush(): Promise<{ success: boolean; error?: string }> {
  try {
    const subscription = await getActivePushSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      // Remove from Supabase if configured
      if (supabase) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
      }
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to unsubscribe.' };
  }
}

