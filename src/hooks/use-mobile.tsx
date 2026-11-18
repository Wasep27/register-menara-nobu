/**
 * @module hooks/use-mobile
 * @description Hook responsif untuk mendeteksi apakah lebar viewport peramban berada di bawah batas seluler (< 768px).
 */
import * as React from "react";

/** Batas breakpoint lebar layar (dalam piksel) antara tampilan seluler dan tablet/desktop (`md` Tailwind). */
const MOBILE_BREAKPOINT = 768;

/**
 * Mengembalikan `true` jika lebar viewport saat ini lebih kecil dari 768px dan otomatis
 * memperbarui nilai saat ukuran jendela atau orientasi perangkat berubah via `matchMedia`.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
