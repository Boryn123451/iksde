const CACHE_NAME = 'deep-weather-app-shell-v2';
const APP_SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET') return;

  const isLocalDev = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  const isViteDevAsset = url.pathname.startsWith('/src/')
    || url.pathname.startsWith('/@vite')
    || url.pathname.startsWith('/@react-refresh')
    || url.pathname.includes('/node_modules/.vite/');
  if (isLocalDev || isViteDevAsset) {
    event.respondWith(fetch(request));
    return;
  }

  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('index.html')));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      });
    })
  );
});
