// Self-destroying service worker.
// Takes control immediately, clears all caches, reloads all tabs, then unregisters.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.clients.claim()
      .then(() => self.caches.keys())
      .then(names => Promise.all(names.map(n => self.caches.delete(n))))
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then(clients => {
        clients.forEach(c => {
          try { c.navigate(c.url); } catch (e) {}
        });
      })
      .then(() => self.registration.unregister())
  );
});

// Forward ALL requests to network — no caching whatsoever
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
