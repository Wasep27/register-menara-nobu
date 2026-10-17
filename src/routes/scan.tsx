import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { supabase } from "@/lib/supabase";
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  ArrowRight,
  ArrowLeft,
  Users,
  LogIn,
  KeyRound,
  FileCheck,
} from "lucide-react";

export const Route = createFileRoute("/scan")({
  head: () => ({
    meta: [
      { title: "Verifikasi Keamanan Akses — Menara Nobu" },
      {
        name: "description",
        content:
          "Halaman verifikasi pass dan pemindai barcode khusus petugas keamanan dan resepsionis Menara Nobu.",
      },
      { property: "og:title", content: "Verifikasi Keamanan Akses — Menara Nobu" },
      {
        property: "og:description",
        content: "Fitur pemindai barcode keamanan hanya dapat diakses oleh petugas terotorisasi.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ScanRedirectPage,
});

const navItems = [
  { to: "/", label: "Beranda" },
  { to: "/registrasi", label: "Registrasi Tamu" },
  { to: "/panduan", label: "Panduan" },
  { to: "/karyawan", label: "Karyawan" },
  { to: "/admin/login", label: "Admin" },
];

function ScanRedirectPage() {
  const navigate = useNavigate();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setIsAuthenticated(true);
        // Otomatis arahkan ke admin scan jika sudah login
        navigate({ to: "/admin/scan" });
      } else {
        setIsAuthenticated(false);
      }
      setCheckingAuth(false);
    });
  }, [navigate]);

  return (
    <main className="min-h-screen bg-background pb-32">
      <SiteNav items={navItems} />

      <div className="fade-up mx-auto max-w-lg px-4 pt-8 sm:pt-12">
        {/* Navigation back pill */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-brand-soft hover:text-primary active:scale-95"
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

        {/* Security Access Gate Card */}
        <div className="overflow-hidden rounded-3xl border border-border/90 bg-card p-6 sm:p-8 shadow-soft text-center space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <ShieldAlert className="h-8 w-8" />
          </div>

          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-300">
              <Lock className="h-3 w-3" />
              <span>Akses Khusus Petugas Keamanan & Admin</span>
            </span>
            <h1 className="mt-3 font-display text-2xl sm:text-3xl font-black text-foreground">
              Pemindai Barcode Khusus Internal
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Demi kepatuhan privasi (UU Pelindungan Data Pribadi) dan mencegah penyalahgunaan kode
              pass, fitur <b>Pemindai Barcode & Verifikasi Pass</b> hanya dapat dioperasikan oleh
              Petugas Keamanan, Resepsionis, atau Admin yang terotentikasi.
            </p>
          </div>

          {/* Action Cards */}
          <div className="pt-2 space-y-2.5">
            <Link
              to="/admin/login"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 font-display text-sm font-bold text-primary-foreground shadow-sm transition-all hover:brightness-110 active:scale-95"
            >
              <LogIn className="h-4 w-4" />
              <span>Masuk ke Portal Petugas / Admin</span>
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>

            <Link
              to="/registrasi"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 text-xs font-semibold text-foreground hover:bg-muted active:scale-95 transition-all"
            >
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>Saya Pengunjung: Isi Formulir Registrasi</span>
            </Link>
          </div>

          {/* Zero-Trust Notice */}
          <div className="rounded-xl border border-border/80 bg-muted/40 p-3 text-left space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span>Mengapa Halaman Ini Dibatasi?</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Sistem manajemen pengunjung Menara Nobu menerapkan prinsip <i>Least Privilege</i>.
              Tamu umum hanya perlu mendaftar dan menyimpan bukti kunjungan digital, sedangkan
              pembacaan barcode dan otorisasi gerbang turnstile dikontrol secara terpusat oleh staf
              berwenang.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-16">
        <SiteFooter />
      </div>
    </main>
  );
}
