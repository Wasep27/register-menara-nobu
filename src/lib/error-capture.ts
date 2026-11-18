/**
 * Utilitas Penangkapan & Deskripsi Error SSR Out-of-Band (`src/lib/error-capture.ts`).
 *
 * Mengapa modul ini diperlukan:
 * Runtime server `h3` menelan exception di dalam handler menjadi respons HTTP 500 JSON generik
 * `{"status":500,"unhandled":true,"message":"HTTPError"}` tanpa stack trace. Modul ini
 * membungkus `console.error` dan global error listener untuk menyimpan objek Error asli
 * selama 5 detik sehingga `src/server.ts` dapat memulihkan detail error ke log server.
 */

let lastCapturedError: { error: unknown; at: number } | undefined;
const TTL_MS = 5_000;

/** Mencatat error terakhir beserta timestamp-nya ke buffer sementara di memori. */
function record(error: unknown) {
  lastCapturedError = { error, at: Date.now() };
}

// Batasi kedalaman rantai `cause` dan panjang teks log agar tidak memicu memory/log overflow
const CAUSE_DEPTH_LIMIT = 5;
const DESCRIPTION_LENGTH_LIMIT = 8_000;

/**
 * Mengurai error (beserta rantai `cause` hingga 5 tingkat dan kode status HTTP) menjadi
 * string deskriptif yang tetap terbaca meskipun melewati pipeline logging yang menyerialisasi objek.
 */
export function describeError(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < CAUSE_DEPTH_LIMIT && current != null; depth++) {
    if (!(current instanceof Error)) {
      parts.push(typeof current === "string" ? current : safeStringify(current));
      break;
    }
    const label = depth === 0 ? "" : "caused by: ";
    const status = describeStatus(current);
    parts.push(`${label}${current.stack ?? `${current.name}: ${current.message}`}${status}`);
    current = current.cause;
  }
  return parts.join("\n").slice(0, DESCRIPTION_LENGTH_LIMIT);
}

/** Mengekstrak properti `status` atau `statusCode` numerik jika ada pada objek Error. */
function describeStatus(error: Error): string {
  const { status, statusCode } = error as { status?: unknown; statusCode?: unknown };
  const value = status ?? statusCode;
  return typeof value === "number" ? ` (status ${value})` : "";
}

/** Mengubah nilai non-Error menjadi string JSON secara aman terhadap circular reference. */
function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

function isErrorLike(value: unknown): value is Error {
  return value instanceof Error;
}

// Bungkus `console.error` agar setiap Error dari lapisan mana pun (termasuk logging internal h3)
// otomatis terekam ke `lastCapturedError` sekaligus diperluas stack/cause-nya sebelum dicetak.
const originalConsoleError = console.error.bind(console);
console.error = (...args: unknown[]) => {
  const expanded = args.map((arg) => {
    if (!isErrorLike(arg)) return arg;
    record(arg);
    return describeError(arg);
  });
  originalConsoleError(...expanded);
};

if (typeof globalThis.addEventListener === "function") {
  globalThis.addEventListener("error", (event) => record((event as ErrorEvent).error ?? event));
  globalThis.addEventListener("unhandledrejection", (event) =>
    record((event as PromiseRejectionEvent).reason),
  );
}

/**
 * Mengambil lalu menghapus error terakhir yang tertangkap (jika belum melewati TTL 5 detik).
 * Digunakan oleh `src/server.ts` saat menormalkan respons 500 `HTTPError` milik h3.
 */
export function consumeLastCapturedError(): unknown {
  if (!lastCapturedError) return undefined;
  if (Date.now() - lastCapturedError.at > TTL_MS) {
    lastCapturedError = undefined;
    return undefined;
  }
  const { error } = lastCapturedError;
  lastCapturedError = undefined;
  return error;
}
