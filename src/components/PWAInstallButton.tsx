import React, { useState } from "react";
import { Download, Smartphone, X, CheckCircle2, Share } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";

interface PWAInstallButtonProps {
  variant?: "badge" | "button" | "menu" | "banner";
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = "badge",
  className = "",
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Jika sudah terpasang atau ditutup oleh user
  if (isInstalled || dismissed) {
    return null;
  }

  // Jika browser belum memicu install prompt dan bukan iOS, sembunyikan secara elegan
  if (!isInstallable && !isIOS) {
    return null;
  }

  const handleInstallClick = () => {
    if (isInstallable) {
      install();
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  // Render variant: Banner ringkas (misal di bagian atas halaman atau beranda)
  if (variant === "banner") {
    return (
      <>
        <div
          className={`flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-2.5 backdrop-blur-sm ${className}`}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Smartphone className="h-4 w-4" />
            </div>
            <div className="text-left text-xs sm:text-sm">
              <p className="font-semibold text-foreground">Pasang Aplikasi Menara Nobu</p>
              <p className="hidden text-xs text-muted-foreground sm:block">
                Akses buku tamu lebih cepat, tanpa antre, & bisa offline
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleInstallClick}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-xs font-bold text-primary-foreground shadow-xs transition hover:brightness-110 active:scale-95"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Install</span>
            </button>
            <button
              onClick={() => setDismissed(true)}
              aria-label="Tutup saran instalasi"
              className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Modal Petunjuk iOS Safari */}
        {showIOSGuide && <IOSGuideModal onClose={() => setShowIOSGuide(false)} />}
      </>
    );
  }

  // Default: Tombol badge / menu di header/nav
  return (
    <>
      <button
        onClick={handleInstallClick}
        title="Pasang aplikasi di layar utama (PWA)"
        className={`inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-all hover:bg-primary hover:text-primary-foreground active:scale-95 ${className}`}
      >
        <Download className="h-3.5 w-3.5" />
        <span>Install App</span>
      </button>

      {showIOSGuide && <IOSGuideModal onClose={() => setShowIOSGuide(false)} />}
    </>
  );
};

function IOSGuideModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          aria-label="Tutup"
          className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary">
          <Smartphone className="h-6 w-6" />
        </div>

        <h3 className="text-center font-display text-lg font-bold text-foreground">
          Pasang di iPhone / iPad
        </h3>
        <p className="mt-1 text-center text-xs text-muted-foreground">
          Gunakan fitur PWA Safari untuk pengalaman tanpa hambatan:
        </p>

        <div className="mt-5 space-y-3 rounded-2xl bg-muted/50 p-4 text-xs text-foreground">
          <div className="flex items-start gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground text-[11px]">
              1
            </span>
            <p>
              Tekan tombol{" "}
              <span className="font-semibold inline-flex items-center gap-1">
                <Share className="inline h-3.5 w-3.5" /> Share
              </span>{" "}
              di bilah navigasi bawah Safari.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground text-[11px]">
              2
            </span>
            <p>
              Gulir ke bawah dan pilih opsi{" "}
              <span className="font-semibold text-primary">"Add to Home Screen"</span> (Tambah ke
              Layar Utama).
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground text-[11px]">
              3
            </span>
            <p>
              Tekan <span className="font-semibold">"Add"</span> di pojok kanan atas. Ikon Buku Tamu
              Nobu akan muncul di layar utama Anda.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-5 inline-flex w-full min-h-11 items-center justify-center rounded-xl bg-primary font-bold text-primary-foreground transition hover:brightness-110 active:scale-95"
        >
          Mengerti
        </button>
      </div>
    </div>
  );
}
