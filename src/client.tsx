/**
 * Titik masuk (Entry Point) Sisi Klien / Browser (`src/client.tsx`).
 *
 * Bertanggung jawab melakukan hidrasi DOM hasil SSR menggunakan React 19 `hydrateRoot`
 * di dalam `startTransition` agar UI tetap responsif, serta mendaftarkan Service Worker PWA
 * segera setelah aplikasi terhidrasi di browser.
 */
import { StrictMode, startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { StartClient } from "@tanstack/react-start/client";
import { registerPwaServiceWorker } from "./lib/pwa";

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient />
    </StrictMode>,
  );

  // Daftarkan PWA Service Worker di client browser untuk dukungan offline & caching aset
  registerPwaServiceWorker();
});
