// Service Worker for Offline App-Shell Support
// Multimodal Attendance & Engagement Agent

const CACHE_NAME = 'multimodal-attendance-v1';

const APP_SHELL_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './css/main.css',
    './css/components.css',
    './css/monitor.css',
    './libs/supabase.min.js',
    './libs/qrcode.min.js',
    './js/config.js',
    './js/db/indexeddb.js',
    './js/db/supabaseClient.js',
    './js/db/sync.js',
    './js/sensors/vision.js',
    './js/sensors/audio.js',
    './js/engine/suggestions.js',
    './js/modules/dashboard.js',
    './js/modules/classes.js',
    './js/modules/students.js',
    './js/modules/sessions.js',
    './js/modules/attendance.js',
    './js/modules/monitor.js',
    './js/modules/analytics.js',
    './js/modules/suggestionsView.js',
    './js/modules/reports.js',
    './js/modules/settings.js',
    './js/app.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[ServiceWorker] Caching app shell assets');
            return cache.addAll(APP_SHELL_ASSETS).catch((err) => {
                console.warn('[ServiceWorker] Some assets could not be pre-cached:', err);
            });
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(
                keyList.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('[ServiceWorker] Removing old cache', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    // Only intercept GET requests
    if (event.request.method !== 'GET') return;

    // Do NOT cache Supabase API calls or external dynamic requests
    const url = new URL(event.request.url);
    if (url.origin.includes('supabase.co')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                // Return cached shell asset, but fetch in background to keep updated (Stale-While-Revalidate)
                fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, networkResponse);
                        });
                    }
                }).catch(() => {});
                return cachedResponse;
            }

            // Fallback to network
            return fetch(event.request).then((networkResponse) => {
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
                return networkResponse;
            }).catch(() => {
                // Offline fallback for navigation requests
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});
