/**
 * Utilitas Registrasi Service Worker untuk Progressive Web App (PWA) (`src/lib/pwa.ts`).
 *
 * Best practice: pendaftaran ditunda hingga event `window.load` agar tidak memperlambat
 * proses hidrasi awal maupun memblokir rendering halaman pertama.
 */

/**
 * Mendaftarkan `/sw.js` di browser pengguna jika dukungan Service Worker tersedia
 * dan memantau siklus pembaruan versi worker baru (`updatefound`).
 */
export function registerPwaServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        // Cek pembaruan Service Worker secara berkala jika versi aplikasi baru dideploy
        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;
          installingWorker.addEventListener("statechange", () => {
            if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
              // Service worker baru sudah terpasang dan siap menggantikan cache lama
              console.log("[PWA] Versi baru tersedia.");
            }
          });
        });
      })
      .catch((err) => {
        console.warn("[PWA] Registrasi Service Worker gagal:", err);
      });
  });
}
