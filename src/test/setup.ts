/**
 * @module test/setup
 * @description Berkas inisialisasi global Vitest untuk environment `jsdom`.
 * Memuat matcher `@testing-library/jest-dom` serta menyediakan stub `window.scrollTo`
 * dan `window.matchMedia` yang belum diimplementasikan secara bawaan oleh `jsdom`.
 */
import "@testing-library/jest-dom/vitest";

// Stub window.scrollTo agar pemanggilan scroll pada router/komponen tidak melempar error di jsdom
Object.defineProperty(window, "scrollTo", {
  writable: true,
  value: () => {},
});

// Stub window.matchMedia untuk hook responsif seperti useIsMobile()
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
