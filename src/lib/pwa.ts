/**
 * Utilitas registrasi Service Worker untuk Progressive Web App (PWA)
 */

export function registerPwaServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        // Cek update sw secara berkala jika ada versi baru
        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;
          installingWorker.addEventListener("statechange", () => {
            if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
              // Service worker baru siap
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
