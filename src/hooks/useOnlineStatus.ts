import { useEffect, useState } from "react";

/**
 * Hook pemantau status koneksi jaringan browser secara real-time (`online` / `offline`).
 *
 * Best practice SSR: state awal diset `true` agar proses rendering di server tidak memicu
 * flash banner offline palsu sebelum hidrasi klien selesai memeriksa `navigator.onLine`.
 *
 * @returns `true` jika browser terhubung ke jaringan, `false` saat offline.
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Setel status awal secara aman di client (default true agar tidak memicu false-offline di SSR/Vercel)
    setIsOnline(navigator.onLine ?? true);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
