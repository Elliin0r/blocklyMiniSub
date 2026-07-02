const CACHE_NAME = 'minisub-v1';

// Vi sparar basen, index och manifestet samt ikonerna
const ASSETS_TO_CACHE = [
  '/blocklyMiniSub/',
  '/blocklyMiniSub/index.html',
  '/blocklyMiniSub/manifest.json',
  '/blocklyMiniSub/icons/icon-192.png',
  '/blocklyMiniSub/icons/icon-512.png'
];

// 1. Installera: Spara basfilerna i enhetens minne
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. Aktivera: Rensa gamla cacher om du uppdaterar appen
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// 3. Fetch: Det magiska offline-stödet!
// Om filen finns i cachen, ta den. Annars hämta från nätet. 
// Om vi hämtar från nätet, spara en kopia i cachen automatiskt!
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        // Spara kodfilerna (som Vite bygger) dynamiskt i cachen när de laddas första gången
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      });
    })
  );
});