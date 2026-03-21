const CACHE_NAME = 'habitrax-shell-v2';
const SHELL_ASSETS = [
  './',
  './index.html',
  './style.css',
  './js/msal-browser.min.js',
  './js/auth.js',
  './js/graph.js',
  './js/app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Only cache-first for same-origin shell assets
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // let CDN/API calls go to network

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
