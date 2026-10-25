const SW_VERSION = 'machead-dash-pwa-v2';
const SHELL_CACHE = `${SW_VERSION}-shell`;

const PRECACHE_URLS = [
  '/',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/logo.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/terminal/wasm_exec.js',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('machead-dash-pwa-') && key !== SHELL_CACHE)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never intercept API routes or OAuth redirect/callback/handoff URLs
  if (
    url.pathname.startsWith('/api/') ||
    url.searchParams.has('code') ||
    url.searchParams.has('state') ||
    url.searchParams.has('provider') ||
    url.searchParams.has('auth_error') ||
    url.searchParams.has('oauth_error') ||
    url.searchParams.has('app_auth')
  ) {
    return;
  }

  // Navigation requests: Network-first, fallback to cached app shell
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const networkResp = await fetch(req);
          if (
            networkResp &&
            networkResp.ok &&
            networkResp.type === 'basic' &&
            url.pathname === '/' &&
            !url.search
          ) {
            const cache = await caches.open(SHELL_CACHE);
            cache.put('/', networkResp.clone()).catch(() => {});
          }
          return networkResp;
        } catch {
          const cached = await caches.match('/');
          if (cached) return cached;
          throw new Error('Offline');
        }
      })()
    );
    return;
  }

  // Static assets (/assets/*, /icons/*, /terminal/wasm_exec.js, /logo.png, /favicon.svg): Stale-While-Revalidate
  // Note: /terminal/tailcat.wasm.gz is cached decompressed by main.js in its own CacheStorage bucket.
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/terminal/wasm_exec.js' ||
    url.pathname === '/logo.png' ||
    url.pathname === '/favicon.svg' ||
    url.pathname === '/manifest.webmanifest'
  ) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(SHELL_CACHE);
        const cached = await cache.match(req);
        const fetchPromise = fetch(req)
          .then((networkResp) => {
            if (networkResp && networkResp.ok) {
              cache.put(req, networkResp.clone()).catch(() => {});
            }
            return networkResp;
          })
          .catch(() => null);

        if (cached) {
          event.waitUntil(fetchPromise);
          return cached;
        }
        const net = await fetchPromise;
        if (net) return net;
        throw new Error('Asset fetch failed');
      })()
    );
  }
});
