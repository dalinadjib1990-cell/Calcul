/**
 * Al-Moalem DZ - Service Worker
 */

const CACHE_NAME = 'almoalem-dz-cache';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => console.log('Asset caching error during installation: ', err));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Clear any old caches immediately during activation to force fresh assets
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          console.log('[Service Worker] Clearing old cache:', cache);
          return caches.delete(cache);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // We only intercept standard GET requests and exclude backend APIs
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }

  // Network-First strategy: Always query the network first to get live/fresh builds.
  // Fall back to cached resources only if the client is completely offline.
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache the newly fetched resource if it's a valid ok response
        if (networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Network was unreachable - retrieve from cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If offline and request is for a page, return a basic offline message or let it fail gently
        });
      })
  );
});
