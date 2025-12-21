
const CACHE_NAME = 'v2s-final-v1';

// No cacheamos nada al principio para forzar que el navegador descargue todo fresco
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

// Estrategia: Intentar red siempre, si falla usar caché solo para la estructura básica
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/'))
    );
    return;
  }
  
  event.respondWith(fetch(event.request));
});
