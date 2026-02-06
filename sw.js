/**
 * ============================================================================
 * YALIN CONSULTING - SERVICE WORKER
 * ============================================================================
 * 
 * Network-first strategy for fresh content, cache fallback for offline.
 * Bump CACHE_VERSION when deploying updates to force cache refresh.
 * 
 * @version 2.0.0
 * ============================================================================
 */

// ⚠️ BUMP THIS VERSION ON EVERY DEPLOY TO BUST CACHE
const CACHE_VERSION = 'v4.20-gtm-analytics';
const CACHE_NAME = `yalin-${CACHE_VERSION}`;
const OFFLINE_URL = '404.html';

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
    'index.html',
    'tr/index.html',
    '404.html',
    'manifest.json'
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {

    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {

                return cache.addAll(PRECACHE_ASSETS);
            })
            .then(() => {
                return self.skipWaiting();
            })
            .catch((error) => {

            })
    );
});

// Activate event - clean up ALL old caches
self.addEventListener('activate', (event) => {

    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => {

                            return caches.delete(name);
                        })
                );
            })
            .then(() => {

                return self.clients.claim();
            })
    );
});

// Fetch event - NETWORK FIRST, cache fallback
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    if (!event.request.url.startsWith('http')) return;

    const url = new URL(event.request.url);
    if (url.origin !== location.origin) return;

    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                return caches.match(event.request)
                    .then((cachedResponse) => {
                        if (cachedResponse) return cachedResponse;
                        if (event.request.mode === 'navigate') {
                            return caches.match(OFFLINE_URL);
                        }
                        return new Response('', { status: 408, statusText: 'Offline' });
                    });
            })
    );
});

// Listen for skip waiting message
self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
});
