import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { QrCodeScanner } from "@/components/QrCodeScanner";
import { type GuestStatusResult } from "@/lib/supabase";
import { getNowWibTimeString } from "@/lib/date-utils";
import {
  ShieldCheck,
  QrCode,
  Sparkles,
  Users,
  CheckCircle2,
  Clock,
  Building2,
  FileText,
  AlertTriangle,
  History,
  Lock,
} from "lucide-react";

export const Route = createFileRoute("/admin/scan")({
  component: AdminScanPage,
});

interface ScannedHistoryItem {
  id: string;
  name: string;
  institution: string;
  badgeCode: string;
  time: string;
  status: string;
}

function AdminScanPage() {
  const [history, setHistory] = useState<ScannedHistoryItem[]>([]);

  const handleScanSuccess = (res: GuestStatusResult) => {
    if (!res.badge_code) return;
    setHistory((prev) => {
      // Cegah duplikat beruntun
      if (prev.length > 0 && prev[0]?.badgeCode === res.badge_code) return prev;
      const newItem: ScannedHistoryItem = {
        id: Math.random().toString(36).substring(2, 9),
        name: res.name || "Tamu Terdaftar",
        institution: res.institution || "Pengunjung",
        badgeCode: res.badge_code || "-",
        time: getNowWibTimeString(),
        status: res.status || "TERVERIFIKASI",
      };
      return [newItem, ...prev.slice(0, 9)];
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              <Lock className="h-3 w-3" />
              <span>Akses Khusus Petugas & Keamanan</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-0.5 text-[11px] font-bold text-primary">
              <ShieldCheck className="h-3 w-3" />
              <span>Pos Lobi Utama</span>
            </span>
          </div>
          <h1 className="mt-1.5 font-display text-2xl sm:text-3xl font-black text-foreground">
            Pemindai Barcode & Verifikasi Pass
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-2xl">
            Verifikasi fisik identitas tamu, periksa status otorisasi masuk, dan konfirmasi
            kedatangan di meja resepsionis atau pos sekuriti Menara Nobu.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link
            to="/admin/tamu"
            className="w-full sm:w-auto inline-flex min-h-11 sm:min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-xs sm:text-sm font-bold text-foreground shadow-2xs hover:bg-muted active:scale-95 transition-all"
          >
            <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span>Lihat Buku Tamu</span>
          </Link>
        </div>
      </div>

      {/* Main Grid: Scanner Left / Log & SOP Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Scanner Component Column */}
        <div className="lg:col-span-7 space-y-4">
          <QrCodeScanner onSuccess={handleScanSuccess} roleMode="security" />

          {/* Privacy & Zero-Trust Notice */}
          <div className="rounded-2xl border border-primary/20 bg-brand-soft/40 p-4 text-xs text-foreground space-y-2">
            <div className="flex items-center gap-2 font-bold text-primary">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>Standar Keamanan Zero-Trust & UU Pelindungan Data Pribadi</span>
            </div>
            <p className="text-[11px] sm:text-xs leading-relaxed text-muted-foreground">
              Pemindai ini hanya dioperasikan oleh petugas keamanan atau resepsionis yang
              terotentikasi. Semua akses pass diverifikasi melalui fungsi tersimpan RPC berizin
              terbatas dan tercatat dalam log audit operasional gedung.
            </p>
          </div>
        </div>

        {/* Right Column: Shift Scan History & SOP */}
        <div className="lg:col-span-5 space-y-5">
          {/* Recent Scans in This Session */}
          <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-3">
              <div className="flex items-center gap-2 font-display text-sm font-bold text-foreground">
                <History className="h-4 w-4 text-primary" />
                <span>Riwayat Verifikasi Sesi Ini</span>
              </div>
              <span className="text-[11px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {history.length} diperiksa
              </span>
            </div>

            {history.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <QrCode className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-xs font-medium">
                  Belum ada kartu tamu yang dipindai pada sesi ini.
                </p>
                <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                  Arahkan kamera ke barcode kartu tamu untuk memulai.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-border/70 bg-muted/30 hover:bg-muted/60 transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-xs text-foreground truncate">{item.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {item.institution}
                      </p>
                      <span className="font-mono text-[10px] font-bold text-primary block mt-0.5">
                        {item.badgeCode}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>{item.status}</span>
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-1 flex items-center justify-end gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        <span>{item.time} WIB</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Security SOP Card */}
          <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 text-xs text-muted-foreground space-y-3 shadow-xs">
            <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>SOP Petugas Keamanan & Resepsionis:</span>
            </h3>
            <ol className="space-y-2.5 list-none pl-0">
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                  1
                </span>
                <span>
                  Minta pengunjung menunjukkan kartu <b>Visitor Badge Pass</b> (tali lanyard atau
                  kartu cetak).
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                  2
                </span>
                <span>
                  Arahkan kamera ke barcode Code 39 atau QR pass hingga terdengar bunyi notifikasi
                  verifikasi.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                  3
                </span>
                <span>
                  Cocokkan nama tamu dan instansi dengan identitas resmi (KTP/SIM/Paspor fisik).
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                  4
                </span>
                <span>
                  Klik tombol <b>Konfirmasi Masuk</b> untuk memvalidasi akses turnstile & membuka
                  pintu lobi.
                </span>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
