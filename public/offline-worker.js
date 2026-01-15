/**
 * ServiceWorker for Offline Mode
 * Implements network-first strategy with cache fallback
 */

const CACHE_NAME = 'karaoke-offline-v1';
const API_ROUTES = ['/api/upload', '/api/send-email', '/api/songs'];
const STATIC_ASSETS = ['/', '/index.html'];

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Cache opened');
      return cache.addAll(STATIC_ASSETS).catch(() => {
        console.log('[ServiceWorker] Some static assets could not be cached');
      });
    })
  );
  self.skipWaiting();
});

/**
 * Activate event - clean old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

/**
 * Fetch event - network first strategy
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API calls - network first
  if (API_ROUTES.some((route) => url.pathname.includes(route))) {
    event.respondWith(networkFirstStrategy(request));
  }
  // Static assets - cache first
  else if (
    request.destination === 'document' ||
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image'
  ) {
    event.respondWith(cacheFirstStrategy(request));
  }
  // Everything else - network first
  else {
    event.respondWith(networkFirstStrategy(request));
  }
});

/**
 * Network-first strategy: try network, fallback to cache
 */
async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request);

    // Only cache GET requests with successful responses
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('[ServiceWorker] Network failed, trying cache:', request.url);

    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    return new Response('Offline - Resource not available', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

/**
 * Cache-first strategy: try cache, fallback to network
 */
async function cacheFirstStrategy(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    // Only cache GET requests with successful responses
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[ServiceWorker] Network and cache failed:', request.url);
    return new Response('Offline - Resource not available', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}
    });
  }
}

/**
 * Message handler for client communication
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      version: '1.0.0',
      cacheVersion: CACHE_NAME,
    });
  }
});
