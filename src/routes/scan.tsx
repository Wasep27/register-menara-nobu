import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { QrCodeScanner } from "@/components/QrCodeScanner";
import {
  QrCode,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
  ArrowLeft,
  Building2,
  Lock,
  Info,
  BadgeCheck,
} from "lucide-react";

export const Route = createFileRoute("/scan")({
  head: () => ({
    meta: [
      { title: "Pindai QR & Check-In Cepat — Menara Nobu" },
      {
        name: "description",
        content:
          "Pindai QR code undangan atau ID badge tamu menggunakan kamera ponsel atau tablet kios lobi untuk verifikasi akses gedung di Menara Nobu.",
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
  const [roleMode, setRoleMode] = useState<"guest" | "security">("guest");

  return (
    <main className="min-h-screen bg-background pb-48 sm:pb-36">
      <SiteNav items={navItems} />

      <div className="fade-up mx-auto max-w-xl px-4 pt-4 sm:pt-6">
        {/* Navigation back pill & shortcut */}
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
            <span>Formulir Registrasi Tamu</span>
            <span>→</span>
          </Link>
        </div>

        {/* Role Mode Selector (Audit Best Practice: Dual-Purpose Scanner) */}
        <div className="mb-5 rounded-2xl border border-border/80 bg-card p-1.5 shadow-xs flex items-center">
          <button
            type="button"
            onClick={() => setRoleMode("guest")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold transition-all ${
              roleMode === "guest"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Tamu / Kios Mandiri</span>
          </button>
          <button
            type="button"
            onClick={() => setRoleMode("security")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold transition-all ${
              roleMode === "security"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Petugas Lobi / Security</span>
          </button>
        </div>

        {/* Hero Title & Contextual Copy based on role */}
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
            <QrCode className="h-3.5 w-3.5 text-primary" />
            {roleMode === "guest"
              ? "Self Check-In Pengunjung"
              : "Verifikasi Akses Gedung & Turnstile"}
          </span>
          <h1 className="mt-2 font-display text-2xl sm:text-3xl font-black text-foreground">
            {roleMode === "guest" ? "Pindai Undangan Digital" : "Pemindai Kartu Akses Tamu"}
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
            {roleMode === "guest"
              ? "Arahkan kamera ke QR code undangan kunjungan Anda untuk konfirmasi kedatangan instan di meja lobi Menara Nobu."
              : "Pindai barcode atau QR badge pass pengunjung untuk memverifikasi keaslian kartu, status aktif hari ini, dan staf penanggung jawab."}
          </p>
        </div>

        {/* Camera Scanner Viewport Component */}
        <QrCodeScanner />

        {/* Best Practice Security Audit Box */}
        <div className="mt-6 rounded-2xl border border-primary/20 bg-brand-soft/40 p-4 text-xs text-foreground space-y-2">
          <div className="flex items-center gap-2 font-bold text-primary">
            <Lock className="h-4 w-4 shrink-0" />
            <span>Audit Keamanan & Kepatuhan Privasi Data</span>
          </div>
          <p className="text-[11px] sm:text-xs leading-relaxed text-muted-foreground">
            Fitur pemindai ini mematuhi standar keamanan <b>Zero-Trust VMS</b>. Verifikasi diproses
            melalui fungsi tersimpan PostgreSQL berizin terbatas (<code>check_guest_status</code>)
            yang hanya mencocokkan kode pass spesifik, tanpa pernah membuka akses pembacaan database
            tamu lainnya kepada publik.
          </p>
        </div>

        {/* Guide / How it Works Section */}
        <div className="mt-6 rounded-2xl border border-border/80 bg-card p-4 sm:p-5 text-xs text-muted-foreground space-y-3">
          <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {roleMode === "guest"
              ? "Panduan Check-In Mandiri Tamu:"
              : "SOP Verifikasi Petugas Lobi / Keamanan:"}
          </h3>
          <ul className="space-y-2.5 list-none pl-0">
            <li className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                1
              </span>
              <span>
                {roleMode === "guest"
                  ? "Buka QR code undangan yang Anda terima di ponsel atau kartu kunjungan cetak Anda."
                  : "Minta pengunjung memperlihatkan kartu Visitor Badge Pass (lanyard atau stiker)."}
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                2
              </span>
              <span>
                Posisikan QR code atau barcode pass tepat di tengah kotak bidik kamera hingga suara
                indikator konfirmasi terdengar.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                3
              </span>
              <span>
                {roleMode === "guest"
                  ? "Status kehadiran Anda otomatis tercatat dan notifikasi kedatangan dikirimkan ke staf yang Anda tuju."
                  : "Pastikan status menunjukkan 'AKTIF HARI INI' dan data instansi sesuai dengan tanda pengenal fisik pengunjung."}
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
