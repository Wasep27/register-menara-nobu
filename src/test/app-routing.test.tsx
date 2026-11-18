/**
 * @module test/app-routing.test
 * @description Uji integrasi pohon rute TanStack Router (`routeTree`) untuk memastikan rute root `/`
 * terpetakan ke halaman beranda dan tidak jatuh ke rute fallback Not Found (`__root__`).
 */
import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Cocokkan rute tanpa menjalankan loader maupun render penuh: loader memerlukan koneksi
// jaringan/server dan jsdom tidak memuat stylesheet yang ditunggu oleh React.
describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });
});
