/* Phase 0 service-worker placeholder: cache app shell, never evidence images. */
const CACHE = "metroscan-shell-v0";
const SHELL = ["/", "/index.html", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Network-first for API; cache-first for app shell only.
  if (event.request.url.includes("/api/")) return;
  event.respondWith(
    caches.match(event.request).then((hit) => hit || fetch(event.request)),
  );
});
