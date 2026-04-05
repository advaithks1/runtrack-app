const CACHE_NAME = "make-u-run-v2";

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

  // ❌ Never cache/intercept API requests (important for auth)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request));
    return;
  }

  // Handle page navigation requests
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          return networkResponse;
        })
        .catch(() => {
          return caches.match("/index.html").then((cachedPage) => {
            return (
              cachedPage ||
              new Response("Offline", {
                status: 503,
                statusText: "Offline"
              })
            );
          });
        })
    );
    return;
  }

  // Handle static assets (CSS, JS, images, icons, etc.)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((networkResponse) => {
          // Cache only valid successful responses
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();

            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }

          return networkResponse;
        })
        .catch(() => {
          // If icon/image/css/js missing, return safe response
          return new Response("Offline or file not found", {
            status: 503,
            statusText: "Offline"
          });
        });
    })
  );
});