// Service Worker Version
const CACHE_VERSION = 'v1';
const CACHE_NAME = `app-cache-${CACHE_VERSION}`;

// Resources to cache immediately
const PRECACHE_RESOURCES = [
    '/',
    '/styles.css',
    '/icons/sprite-sheet.svg',
    'https://cdnjs.cloudflare.com/ajax/libs/htmx/1.9.10/htmx.min.js'
];

// Install Service Worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(PRECACHE_RESOURCES))
            .then(() => self.skipWaiting())
    );
});

// Clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch Strategy: Cache First, Network Fallback
self.addEventListener('fetch', event => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Handle HTMX requests differently
    if (event.request.headers.get('HX-Request')) {
        return event.respondWith(
            fetch(event.request)
                .catch(() => caches.match(event.request))
        );
    }

    // Regular requests: Cache First strategy
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    // Return cached response immediately
                    return cachedResponse;
                }

                return fetch(event.request).then(response => {
                    // Don't cache if not a success response
                    if (!response || response.status !== 200) {
                        return response;
                    }

                    // Cache the new response
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });

                    return response;
                });
            })
            .catch(() => {
                // Return offline page if available
                return caches.match('/offline.html');
            })
    );
});

// Handle background sync for offline operations
self.addEventListener('sync', event => {
    if (event.tag === 'sync-updates') {
        event.waitUntil(
            // Process any queued operations
            processBackgroundSync()
        );
    }
});