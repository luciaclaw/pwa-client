/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = 'lucia-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first with cache fallback for navigation
self.addEventListener('fetch', (event) => {
  // Skip non-GET, WebSocket, and non-http(s) requests
  if (event.request.method !== 'GET') return;
  if (event.request.headers.get('upgrade') === 'websocket') return;
  const url = new URL(event.request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        // Fallback to cache
        caches.match(event.request).then((cached) => cached || new Response('Offline', { status: 503 }))
      )
  );
});

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? { title: 'Lucia', body: 'New notification' };

  const options: NotificationOptions = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    data: {
      url: data.url || '/chat',
      toolCallId: data.toolCallId,
      actions: data.actions,
    },
  };

  // Add action buttons for tool confirmations
  if (data.actions && Array.isArray(data.actions)) {
    options.actions = data.actions.map((action: { id: string; label: string }) => ({
      action: action.id,
      title: action.label,
    }));
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click: handle actions and navigation
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notifData = event.notification.data || {};
  const action = event.action;
  const toolCallId = notifData.toolCallId;

  // If an action button was clicked and there's a tool call to respond to,
  // post the response to the active client
  if (action && toolCallId) {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        for (const client of clients) {
          client.postMessage({
            type: 'tool-confirmation-response',
            toolCallId,
            action, // 'approve' or 'deny'
          });
        }
        // Also focus/open the app
        return focusOrOpen(clients, notifData.url || '/chat');
      })
    );
    return;
  }

  // Default: open or focus the app
  const url = notifData.url || '/chat';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) =>
      focusOrOpen(clients, url)
    )
  );
});

function focusOrOpen(clients: readonly WindowClient[], url: string): Promise<WindowClient | null> {
  for (const client of clients) {
    if (client.url.includes(url) && 'focus' in client) {
      return client.focus();
    }
  }
  return self.clients.openWindow(url);
}

export {};
