const CACHE = 'couplegoals-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/app.js',
  './js/db.js',
  './js/views.js',
  './js/ai.js',
  './js/notifications.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Network-first for API calls (AI), cache-first for everything else
  if (url.origin !== location.origin) {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetcher = fetch(req).then((resp) => {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return resp;
      }).catch(() => cached);
      return cached || fetcher;
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

// Periodic notification support via push (no server push; handled via Notification API from app)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: 'window' }).then((cls) => {
    if (cls.length) return cls[0].focus();
    return clients.openWindow('./index.html');
  }));
});
