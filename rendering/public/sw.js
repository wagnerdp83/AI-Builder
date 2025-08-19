const CACHE_NAME = "astro-landing-page-v2";
const STATIC_CACHE = "static-v2";
const DYNAMIC_CACHE = "dynamic-v2";

const STATIC_ASSETS = [
  "/",
  "/styles/globals.css",
  "/styles/non-critical.css",
  "/offline.html",
  "/fonts/inter-var.woff2",
  "/favicon.svg",
  "/robots.txt",
  "/sitemap.xml",
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        return Promise.allSettled(
          STATIC_ASSETS.map((url) =>
            fetch(url, { credentials: "same-origin" })
              .then((response) => {
                if (!response.ok) throw new Error(`Failed to fetch ${url}`);
                return cache.put(url, response);
              })
              .catch((error) => console.warn(`Failed to cache ${url}:`, error)),
          ),
        );
      }),
      caches.open(DYNAMIC_CACHE),
    ]),
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              return caches.delete(cacheName);
            }
          }),
        );
      }),
      clients.claim(),
    ]),
  );
});

// Fetch event - implement stale-while-revalidate strategy
self.addEventListener("fetch", (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip non-GET requests
  if (event.request.method !== "GET") {
    return;
  }

  // For HTML requests, try network first
  if (event.request.headers.get("accept").includes("text/html")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (!response.ok) throw new Error("Network response was not ok");
          const responseToCache = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((response) => {
            if (response) return response;
            return caches.match("/offline.html");
          });
        }),
    );
    return;
  }

  // For static assets, try cache first
  if (STATIC_ASSETS.includes(new URL(event.request.url).pathname)) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          // Update cache in background
          fetch(event.request).then((freshResponse) => {
            if (freshResponse.ok) {
              caches.open(STATIC_CACHE).then((cache) => {
                cache.put(event.request, freshResponse);
              });
            }
          });
          return response;
        }
        return fetch(event.request).then((response) => {
          if (!response.ok) throw new Error("Network response was not ok");
          const responseToCache = response.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        });
      }),
    );
    return;
  }

  // For other requests, use stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((response) => {
        if (!response.ok) throw new Error("Network response was not ok");
        const responseToCache = response.clone();
        caches.open(DYNAMIC_CACHE).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      });

      return cachedResponse || fetchPromise;
    }),
  );
});

// Background sync for assets
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-assets") {
    event.waitUntil(syncAssets());
  }
});

// Push notification handling
self.addEventListener("push", (event) => {
  const options = {
    body: event.data.text(),
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      {
        action: "explore",
        title: "View",
        icon: "/favicon.svg",
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification("AI Beta Landing Page", options),
  );
});

// Helper function to sync assets
async function syncAssets() {
  try {
    const [staticCache, dynamicCache] = await Promise.all([
      caches.open(STATIC_CACHE),
      caches.open(DYNAMIC_CACHE),
    ]);

    await Promise.allSettled([
      ...STATIC_ASSETS.map((url) => updateCache(staticCache, url)),
      ...Array.from(await dynamicCache.keys()).map((request) =>
        updateCache(dynamicCache, request),
      ),
    ]);
  } catch (error) {
    console.warn("Sync failed:", error);
  }
}

async function updateCache(cache, request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response);
    }
  } catch (error) {
    console.warn(`Failed to update cache for ${request}:`, error);
  }
}
