const CACHE_NAME = 'camara-pwa-v4';
const DYNAMIC_CACHE_NAME = 'camara-dynamic-v2'; // Para nuestras fotos

const urlsToCache = [
    './',
    './index.html',
    './app.js',
    './estilos.css',
    './manifest.json',
    './images/icons/icon-192.svg',
    './images/icons/icon-512.svg'
];

// --- Evento install: Almacenamiento del App Shell ---
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                console.log('[SW] Cache (App Shell) abierto');
                return cache.addAll(urlsToCache);
            })
    );
});

// --- Evento fetch: Estrategia Cache First (para el App Shell) ---
self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request)
            .then(function(response) {
                // Si está en caché, lo devuelve
                if (response) {
                    return response;
                }
                // Si no, va a la red
                return fetch(event.request);
            })
    );
});

// --- Evento activate: Limpieza de Cachés Antiguos ---
self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    // Borra los cachés que NO sean el App Shell actual
                    // Y que NO sean nuestro caché dinámico de fotos
                    if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
                        console.log('[SW] Borrando caché antiguo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});