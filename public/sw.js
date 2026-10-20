/**
 * Service Worker untuk PWA Buku Tamu Digital Menara Nobu
 * Versi: v2 (Optimasi Offline Caching, Resilient Precache, & Google Fonts)
 */

const CACHE_NAME = "nobu-guestbook-pwa-v2";
const OFFLINE_FALLBACK_URL = "/offline.html";

const PRECACHE_ASSETS = [
  "/",
  "/offline.html",
  "/manifest.webmanifest",
  "/manifest.json",
  "/favicon.png",
  "/apple-touch-icon.png",
  "/pwa-192x192.png",
  "/pwa-512x512.png",
  "/pwa-maskable-512x512.png",
  "/screenshot-mobile.png",
  "/screenshot-desktop.png",
  "/pwa-icon.svg",
];

// 1. Install: Precache file-file inti dengan toleransi jaringan (resilient caching)
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        // Gunakan Promise.allSettled agar jika 1 file gagal, Service Worker tetap aktif terpasang
        await Promise.allSettled(
          PRECACHE_ASSETS.map(async (assetUrl) => {
            try {
              const response = await fetch(assetUrl, { cache: "no-cache" });
              if (response.ok) {
                await cache.put(assetUrl, response);
              }
            } catch (err) {
              console.warn("[SW] Gagal memuat aset precache:", assetUrl, err);
            }
          }),
        );
      })
      .then(() => self.skipWaiting()),
  );
});

// 2. Activate: Bersihkan versi cache terdahulu dan ambil kendali klien langsung
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log("[SW] Menghapus cache usang:", name);
              return caches.delete(name);
            }),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// 3. Fetch: Strategi caching cerdas
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Hanya proses request GET http(s)
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (!url.protocol.startsWith("http")) return;

  // Lewatkan komunikasi Supabase, WebSockets, dan endpoint dinamis
  if (
    url.hostname.includes("supabase.co") ||
    url.pathname.startsWith("/api") ||
    request.headers.get("Upgrade") === "websocket"
  ) {
    return;
  }

  // A. Navigasi Halaman HTML: Network First -> Cache -> Offline Fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          // Cari halaman yang pernah dibuka sebelumnya di cache
          const cachedPage = await caches.match(request);
          if (cachedPage) return cachedPage;

          // Jika belum pernah dikunjungi, tampilkan halaman offline ramah pengguna
          const offlineFallback = await caches.match(OFFLINE_FALLBACK_URL);
          return (
            offlineFallback ||
            new Response("Koneksi terputus. Buka kembali saat online.", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            })
          );
        }),
    );
    return;
  }

  // B. Google Fonts & Webfonts: Cache First (agar tampilan font tetap elegan saat offline)
  if (
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com" ||
    request.destination === "font" ||
    url.pathname.endsWith(".woff2")
  ) {
    event.respondWith(
      caches.match(request).then((cachedFont) => {
        if (cachedFont) return cachedFont;
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        });
      }),
    );
    return;
  }

  // C. Aset Statis (CSS, JS, Gambar, Ikon): Stale-While-Revalidate
  if (
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "image" ||
    url.pathname.startsWith("/assets/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".jpeg") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".webmanifest") ||
    url.pathname.endsWith(".json")
  ) {
    event.respondWith(
      caches.match(request).then((cachedAsset) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.ok) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return networkResponse;
          })
          .catch(() => cachedAsset);

        return cachedAsset || fetchPromise;
      }),
    );
    return;
  }

  // D. Default: Coba jaringan dengan fallback cache
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});

// Listener pesan untuk pembaruan manual via UI
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
