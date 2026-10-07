// Native OS Desktop Notification & Web Audio Chime Utility

/**
 * Play a clean, subtle audio chime for notifications using Web Audio API
 */
export function playNotificationSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const ctx = new AudioContextClass();
    
    // Smooth dual-tone chime (Linear/Slack style)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';

    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc1.frequency.exponentialRampToValueAtTime(880.0, ctx.currentTime + 0.12); // A5

    osc2.frequency.setValueAtTime(440.0, ctx.currentTime); // A4
    osc2.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.12); // E5

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.36);
    osc2.stop(ctx.currentTime + 0.36);
  } catch {
    // AudioContext autoplay might be muted or blocked by user
  }
}

/**
 * Check current desktop notification permission status
 */
export function getDesktopNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

/**
 * Request OS native notification permission from browser
 */
export async function requestDesktopNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (e) {
    console.warn('Desktop notification request failed:', e);
    return 'denied';
  }
}

/**
 * Trigger native Windows / macOS / Linux desktop banner
 */
export async function sendNativeNotification(
  title: string,
  options?: {
    body?: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: any;
    onClickUrl?: string;
    onClick?: () => void;
    silent?: boolean;
    requireInteraction?: boolean;
  }
): Promise<Notification | boolean | null> {
  // Always play the subtle in-app chime unless silent
  if (!options?.silent) {
    playNotificationSound();
  }

  // 0. Highest Priority: Native Desktop Electron Bridge (Windows / macOS / Linux)
  if (typeof window !== 'undefined' && (window as any).electronAPI?.sendNotification) {
    try {
      const sent = await (window as any).electronAPI.sendNotification({
        title,
        body: options?.body || 'TCY One Workspace Update',
        subtitle: 'TCY One Enterprise',
      });
      if (sent) return true;
    } catch (e) {
      console.warn('[Notification] Electron native notification dispatch warning:', e);
    }
  }

  if (!('Notification' in window)) {
    console.warn('[Notification] Notifications not supported in this browser window.');
    return null;
  }

  // If permission not yet granted, attempt requesting it
  let perm = Notification.permission;
  if (perm === 'default') {
    perm = await requestDesktopNotificationPermission();
  }

  if (perm !== 'granted') {
    console.warn('[Notification] Permission is:', perm);
    return null;
  }

  // 1. Primary: Use ServiceWorker showNotification (Native Windows Action Center integration)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(title, {
          body: options?.body || 'TCY One Workspace Update',
          icon: options?.icon || window.location.origin + '/favicon.ico',
          badge: options?.badge || window.location.origin + '/favicon.ico',
          tag: options?.tag || `tcy-notif-${Date.now()}`,
          data: {
            url: options?.onClickUrl || '/',
            ...options?.data,
          },
          requireInteraction: options?.requireInteraction ?? false,
          silent: options?.silent,
        });
        return true;
      }
    } catch (swErr) {
      console.warn('[Notification] ServiceWorker showNotification notice, falling back:', swErr);
    }
  }

  // 2. Fallback: Classic Window Notification object
  try {
    const notif = new Notification(title, {
      body: options?.body || 'TCY One Workspace Update',
      icon: options?.icon || '/favicon.ico',
      tag: options?.tag || `tcy-notif-${Date.now()}`,
      data: options?.data,
      silent: options?.silent,
      requireInteraction: options?.requireInteraction ?? false,
    });

    notif.onclick = () => {
      window.focus();
      if (options?.onClick) {
        options.onClick();
      } else if (options?.onClickUrl) {
        if (options.onClickUrl.startsWith('http')) {
          window.open(options.onClickUrl, '_blank');
        } else {
          window.location.hash = options.onClickUrl;
        }
      }
      notif.close();
    };

    return notif;
  } catch (err) {
    console.warn('[Notification] Native notification trigger error:', err);
    return null;
  }
}

export const sendDesktopNotification = sendNativeNotification;

