import React, { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Wifi, WifiOff } from "lucide-react";

/**
 * Komponen pemantau status jaringan yang responsif dan dinamis.
 * Tidak merender elemen statis di DOM agar tidak mengganggu layout atau menutupi tombol.
 * Menggunakan sistem notifikasi toast interaktif yang dapat ditutup kapan saja oleh pengguna.
 */
export const OfflineIndicator: React.FC = () => {
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOffline = () => {
      toast.warning("Mode Offline", {
        id: "network-status-toast",
        description: "Draf formulir tetap aman tersimpan di browser ini.",
        icon: <WifiOff className="h-4 w-4 text-amber-500" />,
        duration: 8000,
        action: {
          label: "Tutup",
          onClick: () => toast.dismiss("network-status-toast"),
        },
      });
    };

    const handleOnline = () => {
      // Hanya munculkan notifikasi pulih jika bukan saat pertama kali mount
      if (!isInitialMount.current) {
        toast.success("Koneksi Pulih", {
          id: "network-status-toast",
          description: "Perangkat Anda telah terhubung kembali ke jaringan internet.",
          icon: <Wifi className="h-4 w-4 text-emerald-500" />,
          duration: 4000,
        });
      }
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    isInitialMount.current = false;

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return null;
};
