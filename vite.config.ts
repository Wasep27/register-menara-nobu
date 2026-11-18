/**
 * Konfigurasi Vite & TanStack Start untuk Aplikasi Buku Tamu Digital Menara Nobu.
 *
 * Catatan penting:
 * Preset `@lovable.dev/vite-tanstack-config` sudah menyertakan plugin bawaan berikut secara otomatis,
 * sehingga JANGAN menambahkannya lagi secara manual agar tidak terjadi duplikasi plugin:
 * - TanStack devtools (khusus dev), tanstackStart, viteReact, tailwindcss, tsConfigPaths
 * - nitro (untuk build SSR), injeksi env `VITE_*`, alias path `@`, dedupe React/TanStack, serta pengaturan sandbox.
 */
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

/**
 * Plugin fallback untuk menangani perubahan hash `rolldown-runtime-*.js` di folder cache Vite.
 *
 * Mengapa diperlukan:
 * Saat Vite melakukan pre-bundling ulang di lingkungan dev/preview, permintaan modul yang masih
 * mengacu pada hash `rolldown-runtime` versi sebelumnya bisa menghasilkan 404 jika berkas lama
 * sudah terganti. Plugin ini melayani berkas runtime aktif dari `node_modules/.vite/deps`
 * baik melalui middleware HTTP dev server maupun hook `load()` bundler.
 */
function rolldownRuntimeFallbackPlugin(): Plugin {
  return {
    name: "rolldown-runtime-fallback",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split("?")[0] || "";
        if (url.includes("rolldown-runtime-") && url.endsWith(".js")) {
          const depsDir = path.resolve(process.cwd(), "node_modules/.vite/deps");
          if (fs.existsSync(depsDir)) {
            const files = fs.readdirSync(depsDir);
            const activeRuntime = files.find(
              (f) => f.startsWith("rolldown-runtime-") && f.endsWith(".js") && !f.includes(".map"),
            );
            if (activeRuntime) {
              const content = fs.readFileSync(path.join(depsDir, activeRuntime), "utf-8");
              res.setHeader("Content-Type", "application/javascript");
              res.end(content);
              return;
            }
          }
        }
        next();
      });
    },
    load(id) {
      const cleanId = id.split("?")[0] ?? "";
      if (cleanId && cleanId.includes("rolldown-runtime-") && cleanId.endsWith(".js")) {
        if (!fs.existsSync(cleanId)) {
          const depsDir = path.resolve(process.cwd(), "node_modules/.vite/deps");
          if (fs.existsSync(depsDir)) {
            const files = fs.readdirSync(depsDir);
            const activeRuntime = files.find(
              (f) => f.startsWith("rolldown-runtime-") && f.endsWith(".js") && !f.includes(".map"),
            );
            if (activeRuntime) {
              return fs.readFileSync(path.join(depsDir, activeRuntime), "utf-8");
            }
          }
        }
      }
      return null;
    },
  };
}

export default defineConfig({
  vite: {
    server: {
      // Dengarkan seluruh interface jaringan agar preview/container dapat mengakses port 3000.
      host: "0.0.0.0",
      port: 3000,
      allowedHosts: true,
    },
  },
  plugins: [rolldownRuntimeFallbackPlugin()],
  tanstackStart: {
    // Arahkan entry server & client TanStack Start ke modul kustom kita (`src/server.ts` & `src/client.tsx`)
    // agar pembungkus error SSR dan hydration berjalan konsisten di mode dev maupun build Nitro.
    server: { entry: "server" },
    client: { entry: "client" },
  },
});
