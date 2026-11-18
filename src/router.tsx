/**
 * Konfigurasi Router Aplikasi (`src/router.tsx`).
 *
 * Menghubungkan pohon rute hasil generasi (`routeTree.gen.ts`) dengan instance `QueryClient`
 * per permintaan (penting untuk isolasi data saat SSR) dan mengaktifkan pemulihan posisi scroll.
 */
import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

/**
 * Factory pembuat instance TanStack Router baru beserta konteks TanStack Query.
 * Menggunakan `defaultPreloadStaleTime: 0` agar data preload selalu diteruskan ke loader/query.
 */
export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
