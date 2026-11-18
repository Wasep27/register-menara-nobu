/**
 * Utilitas Manajemen Persetujuan Cookie (`src/lib/consent.ts`).
 *
 * Menyimpan preferensi privasi pengunjung di `localStorage` dan menyiarkan custom event
 * `nobu-consent-change` agar komponen banner/modal cookie selalu sinkron seketika.
 */

/** Struktur preferensi cookie pengunjung (`necessary` selalu bernilai `true`). */
export type Consent = {
  necessary: true;
  preferences: boolean;
  analytics: boolean;
  decided: boolean;
};
const KEY = "nobu-cookie-consent";

/** Nama custom event window saat preferensi cookie diperbarui. */
export const EVENT = "nobu-consent-change";

/** Membaca preferensi cookie dari `localStorage`; mengembalikan `null` jika belum diputuskan atau saat SSR. */
export function readConsent(): Consent | null {
  try {
    const v = localStorage.getItem(KEY);
    return v ? (JSON.parse(v) as Consent) : null;
  } catch {
    return null;
  }
}

/** Menyimpan preferensi cookie ke `localStorage` lalu memicu event `nobu-consent-change`. */
export function saveConsent(c: Omit<Consent, "necessary" | "decided">) {
  const full: Consent = { necessary: true, decided: true, ...c };
  localStorage.setItem(KEY, JSON.stringify(full));
  window.dispatchEvent(new Event(EVENT));
}
