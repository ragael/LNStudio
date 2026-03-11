const CACHE_NAME = "ln-studio-v1";

// Ficheiros base para cache off-line
const ASSETS_TO_CACHE = ["./", "./index.html", "./manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Cache aberto com sucesso");
      return cache.addAll(ASSETS_TO_CACHE);
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("Limpando cache antigo:", cache);
            return caches.delete(cache);
          }
        }),
      );
    }),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Ignora chamadas para o Firestore e autenticação para evitar bugs
  if (
    event.request.url.includes("firestore.googleapis.com") ||
    event.request.url.includes("securetoken.googleapis.com")
  ) {
    return;
  }

  event.respondWith(
    caches
      .match(event.request)
      .then((response) => {
        // Retorna do cache se encontrar, senão vai à rede (Network fallback)
        return response || fetch(event.request);
      })
      .catch(() => {
        // Fallback offline genérico, se necessário
        return caches.match("./index.html");
      }),
  );
});
