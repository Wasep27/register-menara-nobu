/**
 * Service Worker untuk PWA Buku Tamu Digital Menara Nobu
 * Mendukung caching offline, pembaruan otomatis, dan fallback halaman offline
 */

const CACHE_NAME = "nobu-guestbook-pwa-v1";
const OFFLINE_FALLBACK_URL = "/offline.html";

const PRECACHE_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/manifest.json",
  "/favicon.png",
  "/apple-touch-icon.png",
  "/pwa-192x192.png",
  "/pwa-512x512.png",
  "/pwa-maskable-512x512.png",
  "/offline.html",
];

// Install: Precache file-file penting
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

// Activate: Bersihkan cache versi lama
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Fetch: Tangani routing dan fallback offline
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Lewatkan request non-GET dan request ke API backend Supabase
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Jangan cache request ke Supabase API atau WebSockets
  if (
    url.hostname.includes("supabase.co") ||
    url.pathname.startsWith("/api") ||
    request.headers.get("Upgrade") === "websocket"
  ) {
    return;
  }

  // Strategi 1: Navigasi Halaman HTML (Network First -> Cache Fallback -> Offline Page)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          const offlinePage = await caches.match(OFFLINE_FALLBACK_URL);
          return offlinePage || new Response("Offline", { status: 503, statusText: "Offline" });
        }),
    );
    return;
  }

  // Strategi 2: Static Assets (Styles, Scripts, Images, Fonts) - Stale-While-Revalidate
  if (
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "image" ||
    request.destination === "font" ||
    url.pathname.startsWith("/assets/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".woff2")
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.ok) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      }),
    );
    return;
  }

  // Default: Network with Cache fallback
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});

// Listener untuk pesan pembaruan (misal: tombol Perbarui Versi di UI)
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
