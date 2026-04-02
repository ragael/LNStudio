const SW_VERSION = "v2";
const SHELL_CACHE = `ln-studio-shell-${SW_VERSION}`;
const RUNTIME_CACHE = `ln-studio-runtime-${SW_VERSION}`;

// O app agora persiste dados localmente com Dexie/IndexedDB.
// O service worker fica responsavel apenas pelo shell e pelos assets estaticos.
const APP_SHELL_ASSETS = ["./", "./index.html", "./manifest.json", "./favicon.svg"];

const isHttpRequest = (request) => {
  const { protocol } = new URL(request.url);
  return protocol === "http:" || protocol === "https:";
};

const isSameOrigin = (request) => new URL(request.url).origin === self.location.origin;

const isStaticAssetRequest = (request) => {
  const url = new URL(request.url);

  return (
    isSameOrigin(request) &&
    (request.destination === "script" ||
      request.destination === "style" ||
      request.destination === "image" ||
      request.destination === "font" ||
      request.destination === "manifest" ||
      request.destination === "worker" ||
      url.pathname.includes("/assets/"))
  );
};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== SHELL_CACHE && cacheName !== RUNTIME_CACHE) {
            return caches.delete(cacheName);
          }

          return Promise.resolve(false);
        }),
      ),
    ),
  );
  self.clients.claim();
});

const networkFirst = async (request) => {
  const cache = await caches.open(SHELL_CACHE);

  try {
    const response = await fetch(request);

    if (response.ok) {
      await cache.put(request, response.clone());
    }

    return response;
  } catch {
    return (
      (await caches.match(request)) ||
      (await caches.match("./index.html")) ||
      Response.error()
    );
  }
};

const staleWhileRevalidate = async (request) => {
  const cache = await caches.open(RUNTIME_CACHE);
  const cachedResponse = await cache.match(request);

  const networkResponsePromise = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        await cache.put(request, response.clone());
      }

      return response;
    })
    .catch(() => null);

  return cachedResponse || networkResponsePromise || Response.error();
};

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET" || !isHttpRequest(request)) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isStaticAssetRequest(request)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (isSameOrigin(request)) {
    event.respondWith(networkFirst(request));
  }
});
