/**
 * ServiceWorker for Offline Mode + Online Caching
 * Implements network-first strategy with cache fallback
 * Optimizes image and video caching for fast loading across users
 */

const CACHE_NAME = 'karaoke-offline-v1';
const IMAGES_CACHE = 'karaoke-images-v1'; // Persistent cache for category/song images
const VIDEOS_CACHE = 'karaoke-videos-v1'; // Persistent cache for .mp4 files
const API_ROUTES = ['/api/upload', '/api/send-email', '/api/songs'];
const STATIC_ASSETS = ['/', '/index.html'];

// S3 domains to cache
const S3_DOMAINS = ['leeveostockage.s3.eu-west-3.amazonaws.com', 's3.eu-west-3.amazonaws.com'];

// Image extensions to cache aggressively
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

// Video extensions
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.m4v'];

// Cache duration in milliseconds (7 days for images)
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000;
const VIDEO_CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days for videos

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
 * Activate event - clean old caches and manage cache size
 */
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (![CACHE_NAME, IMAGES_CACHE, VIDEOS_CACHE].includes(cacheName)) {
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
 * Fetch event - intelligent caching strategy
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API calls - network first
  if (API_ROUTES.some((route) => url.pathname.includes(route))) {
    event.respondWith(networkFirstStrategy(request));
  }
  // Images from S3 or local - cache-first (aggressive caching)
  else if (isImageRequest(url)) {
    event.respondWith(cacheFirstStrategy(request, IMAGES_CACHE, IMAGE_EXTENSIONS));
  }
  // Videos from S3 - network-first but cache aggressively
  else if (isVideoRequest(url)) {
    event.respondWith(networkFirstStrategy(request, VIDEOS_CACHE, VIDEO_EXTENSIONS));
  }
  // Static assets - cache first
  else if (
    request.destination === 'document' ||
    request.destination === 'style' ||
    request.destination === 'script'
  ) {
    event.respondWith(cacheFirstStrategy(request, CACHE_NAME));
  }
  // Everything else - network first
  else {
    event.respondWith(networkFirstStrategy(request, CACHE_NAME));
  }
});

/**
 * Check if URL is image request
 */
function isImageRequest(url) {
  if (url.pathname.includes('/images/') || url.pathname.includes('/categories/')) {
    return true;
  }
  return IMAGE_EXTENSIONS.some((ext) => url.pathname.toLowerCase().endsWith(ext));
}

/**
 * Check if URL is video request
 */
function isVideoRequest(url) {
  return VIDEO_EXTENSIONS.some((ext) => url.pathname.toLowerCase().endsWith(ext));
}

/**
 * Network-first strategy: try network, fallback to cache
 * @param {Request} request
 * @param {string} cacheName - Cache store name
 * @param {array} extensions - File extensions to cache
 */
async function networkFirstStrategy(request, cacheName = CACHE_NAME, extensions = null) {
  try {
    const response = await fetch(request);

    // Cache successful GET responses
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(cacheName);
      
      // Store metadata about cache time
      const clonedResponse = response.clone();
      const headers = new Headers(clonedResponse.headers);
      headers.append('X-Cache-Time', new Date().toISOString());
      
      const newResponse = new Response(clonedResponse.body, {
        status: clonedResponse.status,
        statusText: clonedResponse.statusText,
        headers: headers
      });
      
      cache.put(request, newResponse);
    }

    return response;
  } catch (error) {
    console.log('[ServiceWorker] Network failed, trying cache:', request.url);

    const cached = await caches.match(request);
    if (cached) {
      console.log('[ServiceWorker] Serving from cache:', request.url);
      return cached;
    }

    return new Response('Offline - Resource not available', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

/**
 * Cache-first strategy: serve from cache, fallback to network
 * Aggressively caches images to avoid repeated downloads
 * @param {Request} request
 * @param {string} cacheName - Cache store name
 * @param {array} extensions - File extensions to cache
 */
async function cacheFirstStrategy(request, cacheName = CACHE_NAME, extensions = null) {
  try {
    // Try cache first
    const cached = await caches.match(request);
    if (cached) {
      // Validate cache age for images/videos
      const cacheTime = cached.headers.get('X-Cache-Time');
      if (cacheTime) {
        const age = Date.now() - new Date(cacheTime).getTime();
        const maxAge = extensions === IMAGE_EXTENSIONS ? CACHE_DURATION : 
                      extensions === VIDEO_EXTENSIONS ? VIDEO_CACHE_DURATION : 
                      CACHE_DURATION;
        
        if (age < maxAge) {
          console.log('[ServiceWorker] Serving from cache (fresh):', request.url);
          return cached;
        }
      } else {
        // No timestamp, serve from cache anyway
        console.log('[ServiceWorker] Serving from cache:', request.url);
        return cached;
      }
    }

    // Cache miss or expired, fetch from network
    const response = await fetch(request);

    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(cacheName);
      
      const clonedResponse = response.clone();
      const headers = new Headers(clonedResponse.headers);
      headers.append('X-Cache-Time', new Date().toISOString());
      
      const newResponse = new Response(clonedResponse.body, {
        status: clonedResponse.status,
        statusText: clonedResponse.statusText,
        headers: headers
      });
      
      cache.put(request, newResponse);
      console.log('[ServiceWorker] Cached:', request.url);
    }

    return response;
  } catch (error) {
    console.log('[ServiceWorker] Network failed and no cache:', request.url);
    
    // Last resort - try to serve any cached version
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
 * Clean up cache storage (called periodically to prevent bloat)
 * Called from client side
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    const cacheName = event.data.cacheName || IMAGES_CACHE;
    caches.delete(cacheName).then(() => {
      console.log('[ServiceWorker] Cleared cache:', cacheName);
      event.ports[0].postMessage({ success: true });
    });
  }
});

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
