// Service Worker for AI Financial Analyst PWA
const CACHE_NAME = 'financial-analyst-v5'; // Updated for layout fixes
const urlsToCache = [
  '/',
  '/index.html',
  '/login.html',
  '/profile.html',
  '/admin.html',
  '/review.html',
  '/admin-review.html',
  '/styles.css',
  '/app.js',
  '/login.js',
  '/profile.js',
  '/admin.js',
  '/review.js',
  '/admin-review.js',
  '/translations.js',
  // '/firebase-config.js', // Always fetch fresh to ensure latest API key
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = request.url;

  // Always fetch firebase-config.js fresh (never cache) to ensure latest API key
  if (url.includes('firebase-config.js')) {
    event.respondWith(fetch(request));
    return;
  }

  // Bypass caching for all Firebase/Google APIs and non-GET requests (uploads)
  if (
    !request ||
    request.method !== 'GET' ||
    url.includes('firestore.googleapis.com') ||
    url.includes('firebasestorage.app') ||
    url.includes('firebaseio.com') ||
    url.includes('googleapis.com') ||
    url.includes('firebaseapp.com')
  ) {
    return; // let the network handle it (no service worker interference)
  }

  event.respondWith(
    caches.match(request)
      .then((response) => response || fetch(request))
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Claim clients immediately after activation
      return self.clients.claim();
    })
  );
});

// Listen for messages from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
