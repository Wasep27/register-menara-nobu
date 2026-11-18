/**
 * @module vitest.config
 * @description Konfigurasi test runner Vitest untuk unit test dan integrasi komponen React di `src/test/`.
 * Menggunakan environment `jsdom` dengan setup global di `src/test/setup.ts` serta alias path `@` -> `./src`.
 */
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    // Emulasi DOM browser untuk komponen React dan utilitas ekspor berbasis canvas/DOM
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
