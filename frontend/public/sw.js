/**
 * Service Worker for Offline Support & Aggressive Caching
 * Phase 5: Sub-1-second optimization for repeat visits
 * 
 * Strategy:
 * - Cache static assets aggressively (JS, CSS, images)
 * - Cache API responses with stale-while-revalidate
 * - Instant page loads for repeat visitors
 */

const CACHE_NAME = 'it-v1';
const API_CACHE = 'it-api-v1';

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/IT logo.jpeg',
  '/manifest.json'
];

// Install event - precache critical assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting()) // Activate immediately
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== API_CACHE)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim()) // Take control immediately
  );
});

// Fetch event - intelligent caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external resources (Facebook Pixel, Google Analytics, etc.)
  // These cause CORS errors and should not be cached
  if (!url.origin.includes('localhost') && 
      !url.origin.includes('147.93.108.205') && 
      url.origin !== location.origin) {
    // Let browser handle external requests without SW interference
    return;
  }

  // Strategy 1: API requests - Stale While Revalidate
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.open(API_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          // Fetch from network in background
          const fetchPromise = fetch(request)
            .then((networkResponse) => {
              // Cache the new response
              if (networkResponse && networkResponse.ok) {
                cache.put(request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch((error) => {
              console.warn('[SW] API fetch failed:', error);
              // Return cached response if network fails
              return cachedResponse;
            });

          // Return cached response immediately (if available), otherwise wait for network
          return cachedResponse || fetchPromise;
        });
      }).catch((error) => {
        console.error('[SW] Cache error:', error);
        return fetch(request); // Fallback to network
      })
    );
    return;
  }

  // Strategy 2: Static assets (JS, CSS, images) - Cache First
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|webp|avif|woff2|woff|ttf)$/) ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/uploads/')
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            // Return cached version immediately
            return cachedResponse;
          }

          // Fetch from network and cache
          return fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.ok) {
                cache.put(request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch((error) => {
              console.warn('[SW] Static asset fetch failed:', url.pathname, error);
              // Return a basic response to prevent crashes
              return new Response('', { status: 404, statusText: 'Not Found' });
            });
        });
      }).catch((error) => {
        console.error('[SW] Cache error:', error);
        return fetch(request).catch(() => {
          return new Response('', { status: 404, statusText: 'Not Found' });
        });
      })
    );
    return;
  }

  // Strategy 3: HTML pages - Network First (always fresh content)
  if (request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // Cache the HTML for offline access
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(request);
        })
    );
    return;
  }

  // Default: Network only
  event.respondWith(fetch(request));
});

// Message event - allow clients to skip waiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(cacheNames.map((name) => caches.delete(name)));
      })
    );
  }
});
