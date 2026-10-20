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

  // Daftarkan PWA Service Worker di client browser
  registerPwaServiceWorker();
});
