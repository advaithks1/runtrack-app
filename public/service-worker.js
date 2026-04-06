const CACHE_NAME = "make-u-run-v3";

const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/home.html",
  "/run.html",
  "/summary.html",
  "/history.html",
  "/profile.html",
  "/css/style.css",
  "/js/login.js",
  "/js/home.js",
  "/js/run.js",
  "/js/summary.js",
  "/js/history.js",
  "/js/profile.js",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

// Install
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        await cache.addAll(ASSETS_TO_CACHE);
      } catch (error) {
        console.error("SW cache addAll failed:", error);
      }
    })
  );
  self.skipWaiting();
});

// Activate
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return null;
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== "GET") return;

  // Never cache/intercept API requests (important for auth/session)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request));
    return;
  }

  // Handle page navigation requests safely
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => networkResponse)
        .catch(async () => {
          // Try exact page from cache first
          const exactPage = await caches.match(request);
          if (exactPage) return exactPage;

          // If exact page not found, fallback to index page
          const indexPage = await caches.match("/index.html");
          if (indexPage) return indexPage;

          return new Response("Offline", {
            status: 503,
            statusText: "Offline"
          });
        })
    );
    return;
  }

  // Handle static assets (cache first, then network)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((networkResponse) => {
          // Cache only successful same-origin responses
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            url.origin === self.location.origin
          ) {
            const responseClone = networkResponse.clone();

            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }

          return networkResponse;
        })
        .catch(() => {
          return new Response("Offline or file not found", {
            status: 503,
            statusText: "Offline"
          });
        });
    })
  );
});