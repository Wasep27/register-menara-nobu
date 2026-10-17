import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { QrCodeScanner } from "@/components/QrCodeScanner";
import { QrCode, ShieldCheck, Sparkles, UserCheck, Users, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/scan")({
  head: () => ({
    meta: [
      { title: "Pindai QR & Check-In Cepat — Menara Nobu" },
      {
        name: "description",
        content:
          "Pindai QR code undangan atau ID tamu menggunakan kamera ponsel untuk check-in instan dan verifikasi status kunjungan di Menara Nobu.",
      },
      { property: "og:title", content: "Pindai QR & Check-In Cepat — Menara Nobu" },
      {
        property: "og:description",
        content: "Pindai QR code undangan atau ID tamu untuk verifikasi status kunjungan.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ScanPage,
});

const navItems = [
  { to: "/", label: "Beranda" },
  { to: "/registrasi", label: "Registrasi Tamu" },
  { to: "/scan", label: "Pindai QR" },
  { to: "/panduan", label: "Panduan" },
  { to: "/karyawan", label: "Karyawan" },
  { to: "/admin/login", label: "Admin" },
];

function ScanPage() {
  return (
    <main className="min-h-screen bg-background pb-36 sm:pb-24">
      <SiteNav items={navItems} />

      <div className="fade-up mx-auto max-w-xl px-4 pt-4 sm:pt-6">
        {/* Navigation back pill */}
        <div className="mb-4 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-brand-soft hover:text-primary active:scale-95"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Kembali ke Beranda</span>
          </Link>

          <Link
            to="/registrasi"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
          >
            <span>Formulir Manual</span>
            <span>→</span>
          </Link>
        </div>

        {/* Hero Title */}
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
            <QrCode className="h-3.5 w-3.5 text-primary" />
            Pemindai Kamera Instan
          </span>
          <h1 className="mt-2 font-display text-2xl sm:text-3xl font-black text-foreground">
            Pindai QR Code Kunjungan
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
            Arahkan kamera ke QR code undangan atau barcode pass Anda untuk check-in instan dan
            memeriksa status kunjungan di Menara Nobu.
          </p>
        </div>

        {/* Camera Scanner Viewport */}
        <QrCodeScanner />

        {/* Guide / How it Works Section */}
        <div className="mt-8 rounded-2xl border border-border/80 bg-muted/30 p-4 sm:p-5 text-xs text-muted-foreground space-y-3">
          <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Cara Menggunakan Pemindai QR:
          </h3>
          <ul className="space-y-2 list-none pl-0">
            <li className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                1
              </span>
              <span>
                Izinkan akses kamera saat diminta oleh browser. Kamera belakang akan aktif secara
                otomatis.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                2
              </span>
              <span>
                Posisikan QR code undangan digital atau kartu badge tamu Anda tepat di dalam kotak
                bidik.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                3
              </span>
              <span>
                Setelah terdeteksi, data pengunjung dan bukti registrasi akan langsung diverifikasi
                secara otomatis.
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-12">
        <SiteFooter />
      </div>
    </main>
  );
}
