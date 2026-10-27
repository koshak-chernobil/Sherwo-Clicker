const CACHE_NAME = 'sherwo-cache-v1';
const urlsToCache = [
    './',
    './index.html',
    './firebase.js',
    './manifest.json',
    './iconsc.png',
    './mushroom.png',
    './bg.png'
];

// Установка — кэшируем основные файлы
self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            // Кэшируем по одному, игнорируя ошибки
            return Promise.all(
                urlsToCache.map(url => 
                    cache.add(url).catch(err => console.log('Файл не найден:', url))
                )
            );
        })
    );
});

// Активация — чистим старый кэш
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

// Перехват запросов (Network First, Fallback to Cache)
self.addEventListener('fetch', event => {
    // Пропускаем запросы к Firebase (чтобы не кэшировать базу)
    if (event.request.url.includes('firebase') || 
        event.request.url.includes('googleapis') || 
        event.request.url.includes('gstatic') ||
        event.request.url.includes('imgbb')) {
        return;
    }
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Кэшируем успешный ответ
                if (response && response.status === 200) {
                    let responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
                }
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});