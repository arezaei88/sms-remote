// Offline support: cache the app shell, serve from cache first, refresh in the background.
// The page registers this file as sw.js?v=N (N comes from index.html). Versioned URLs are what
// get an update past a CDN that keeps serving the old copy of an unchanged address.
const VERSION = new URL(self.location.href).searchParams.get('v') || '0';
const CACHE = 'smsremote-v' + VERSION;
const SHELL = [
  './',
  'app.css?v=' + VERSION,
  'app.js?v=' + VERSION,
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  // Leave other sites and the APK download to the browser; only the app shell is cached.
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.includes('/download/')) return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      // Page loads ignore the query string; files must match exactly so a new ?v= is fetched fresh.
      const cached = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
      const fresh = fetch(req)
        .then((res) => { if (res.ok) cache.put(req, res.clone()); return res; })
        .catch(() => cached);
      return cached || fresh;
    }));
});
