// ==============================================================================
// TCY WORKHUB — W3C SERVICE WORKER & NATIVE DESKTOP PUSH DISPATCHER
// ==============================================================================
// Supports:
// - Windows 10/11 Action Center & Toast alerts
// - macOS Ventura+ Notification Center & Banners (Safari 16+, Chrome, Edge, Firefox)
// - Native actions (Open Workspace, View Task, Dismiss)
// ==============================================================================

const CACHE_NAME = 'tcy-one-pwa-v2';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/icon.png',
  '/app-icon.png',
];


self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Precache skipped for dynamic assets:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// 1. FETCH EVENT: Cache-First for static assets, Network-First for API
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests or Supabase realtime/REST APIs
  if (request.method !== 'GET' || url.pathname.startsWith('/rest/') || url.pathname.startsWith('/auth/') || url.hostname.includes('supabase.co')) {
    return;
  }

  // Stale-While-Revalidate for local scripts/styles/images
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
  }
});


// 1. PUSH EVENT: Receive encrypted VAPID payload from Supabase Edge Function
self.addEventListener('push', (event) => {
  let data = {
    title: 'TCY WorkHub Notification',
    body: 'You have a new workspace update.',
    url: '/',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: `tcy-push-${Date.now()}`,
    data: {},
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch {
      data.body = event.data.text();
    }
  }

  const notificationTitle = data.title;
  const notificationOptions = {
    body: data.body,
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    tag: data.tag || `tcy-notif-${Date.now()}`,
    renotify: true,
    data: {
      url: data.url || '/',
      timestamp: Date.now(),
      ...data.data,
    },
    actions: data.actions || [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(notificationTitle, notificationOptions)
  );
});

// 2. NOTIFICATION CLICK: Focus existing window or open target route on Windows / macOS
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a tab/window is already open, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          if (client.url.includes(self.location.origin)) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// 3. NOTIFICATION CLOSE: Handle analytics/dismissal
self.addEventListener('notificationclose', (event) => {
  // Notification closed by user
});
