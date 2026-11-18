/**
 * Konfigurasi Global TanStack Start (`src/start.ts`).
 *
 * Berkas ini mendaftarkan middleware permintaan tingkat server untuk:
 * 1. Menangkap error tak terduga selama proses SSR agar tidak membocorkan stack trace mentah.
 * 2. Menjaga proteksi CSRF aktif pada seluruh server functions (`handlerType === "serverFn"`).
 */
import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";

/**
 * Middleware penanganan error SSR: meneruskan error HTTP yang sudah memiliki `statusCode`
 * (misalnya 404/redirect) dan merender halaman fallback 500 ramah pengguna untuk error fatal lainnya.
 */
const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// TanStack Start memasang proteksi CSRF otomatis jika `src/start.ts` tidak ada;
// karena kita mendefinisikan berkas ini, proteksi CSRF wajib dipasang ulang secara eksplisit
// agar server functions tetap terlindung dari serangan lintas situs (cross-site requests).
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

/** Instance utama TanStack Start beserta urutan middleware request global. */
export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware, csrfMiddleware],
}));
