/**
 * Entry Point Server SSR (`src/server.ts`).
 *
 * Modul ini membungkus handler server TanStack Start agar setiap kegagalan fatal SSR
 * (termasuk error yang ditelan oleh runtime h3/Nitro menjadi JSON `HTTPError`) tetap tercatat
 * di log server dan menampilkan halaman fallback HTML 500 yang aman bagi pengguna.
 */
import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

/** Memuat handler server TanStack Start secara lazy dan men-cache promise-nya antar request. */
async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

/**
 * Menormalkan respons error fatal dari runtime h3.
 *
 * Catatan teknis: h3 sering mengubah exception di dalam handler menjadi HTTP 500 JSON
 * `{"unhandled":true,"message":"HTTPError"}`, sehingga blok `try/catch` biasa tidak menangkapnya.
 * Fungsi ini memeriksa payload tersebut dan menggantinya dengan halaman HTML fallback yang rapi.
 */
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

/** Mengecek apakah body JSON merupakan format error internal yang ditelan oleh h3. */
function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
