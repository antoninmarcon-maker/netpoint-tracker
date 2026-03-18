/// <reference lib="webworker" />
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

// Activate new SW immediately without waiting for tabs to close
self.skipWaiting();
clientsClaim();

// Clean old caches on activation to prevent stale content
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== 'workbox-precache-v2' && name !== 'navigations')
          .filter((name) => !name.startsWith('workbox-precache'))
          .map((name) => caches.delete(name))
      )
    )
  );
});

// Precache assets injected by vite-plugin-pwa
precacheAndRoute(self.__WB_MANIFEST);

// Use Network-First for navigation requests so a normal refresh always
// fetches the latest HTML from the server (falls back to cache if offline).
const navigationHandler = new NetworkFirst({
  cacheName: 'navigations',
  networkTimeoutSeconds: 3,
});
registerRoute(new NavigationRoute(navigationHandler, {
  denylist: [/^\/~oauth/],
}));

// Handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const title = payload.title || 'My Volley';
    const options: NotificationOptions = {
      body: payload.body || '',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: payload.data || {},
      tag: payload.tag || 'my-volley-notification',
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch {
    // Fallback for plain text
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('My Volley', { body: text, icon: '/pwa-192x192.png' })
    );
  }
});

// Handle notification click — open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow('/');
    })
  );
});
