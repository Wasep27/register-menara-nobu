// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

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
      const cleanId = id.split("?")[0];
      if (cleanId.includes("rolldown-runtime-") && cleanId.endsWith(".js")) {
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
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true,
  },
  plugins: [rolldownRuntimeFallbackPlugin()],
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    client: { entry: "client" },
  },
});
