import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Bell,
  BookOpen,
  Building2,
  CheckCircle2,
  Clock,
  Code2,
  Database,
  ExternalLink,
  FileSpreadsheet,
  Key,
  Layers,
  Lock,
  QrCode,
  Search,
  Server,
  ShieldCheck,
  Smartphone,
  UserCheck,
  Users,
  WifiOff,
} from "lucide-react";
import { supabase, supabaseUrl } from "@/lib/supabase";
import { SiteNav } from "@/components/SiteNav";

export const Route = createFileRoute("/panduan")({
  head: () => ({
    meta: [
      { title: "Panduan Penggunaan & Dokumentasi — Menara Nobu" },
      {
        name: "description",
        content:
          "Panduan lengkap alur penggunaan buku tamu digital bagi pengunjung, karyawan, resepsionis, serta dokumentasi teknis sistem.",
      },
      { property: "og:title", content: "Panduan Penggunaan & Dokumentasi — Menara Nobu" },
      {
        property: "og:description",
        content:
          "Panduan lengkap alur penggunaan buku tamu digital bagi pengunjung, karyawan, resepsionis, serta dokumentasi teknis sistem.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Guide,
});

type Check = { label: string; ok: boolean | null; note: string };

function Guide() {
  const [tab, setTab] = useState<"user" | "tech">("user");
  const [checks, setChecks] = useState<Check[]>([]);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    const out: Check[] = [];
    out.push({
      label: "Alamat Supabase terbaca",
      ok: !!supabaseUrl,
      note: supabaseUrl || "Belum diatur",
    });
    const emp = await supabase.from("employees").select("id", { count: "exact", head: true });
    out.push({
      label: "Terhubung ke database",
      ok: !emp.error,
      note: emp.error ? emp.error.message : `${emp.count ?? 0} karyawan aktif`,
    });
    const p = await supabase.from("visit_purposes").select("id", { count: "exact", head: true });
    out.push({
      label: "Data tujuan kunjungan",
      ok: !p.error && (p.count ?? 0) > 0,
      note: p.error ? p.error.message : `${p.count ?? 0} tujuan`,
    });
    const d = await supabase.rpc("get_draft", { _token: crypto.randomUUID() });
    out.push({
      label: "Fungsi simpan otomatis",
      ok: !d.error,
      note: d.error ? "Jalankan ulang skrip SQL" : "Siap",
    });
    const l = await supabase.rpc("login_lock_seconds", { _email: "cek@contoh.com" });
    out.push({
      label: "Pembatasan login",
      ok: !l.error,
      note: l.error ? "Jalankan ulang skrip SQL" : "Aktif",
    });
    const g = await supabase.from("guests").select("id").limit(1);
    out.push({
      label: "Data tamu terlindungi",
      ok: (g.data?.length ?? 0) === 0,
      note:
        (g.data?.length ?? 0) === 0
          ? "Pengunjung umum tidak bisa membaca data tamu"
          : "PERINGATAN: data tamu terbaca publik",
    });
    setChecks(out);
    setRunning(false);
  };

  const cardStyle = "rounded-2xl bg-card p-5 sm:p-6 shadow-soft border border-border/60";
  const codeStyle =
    "mt-2 block overflow-x-auto rounded-xl bg-muted px-3.5 py-2.5 font-mono text-xs sm:text-sm text-foreground";

  return (
    <main className="min-h-screen bg-background pb-12">
      <SiteNav
        items={[
          { to: "/", label: "Beranda" },
          { to: "/registrasi", label: "Registrasi Tamu" },
          { to: "/panduan", label: "Panduan" },
          { to: "/karyawan", label: "Karyawan" },
          { to: "/admin/login", label: "Admin" },
        ]}
      />

      <div className="fade-up mx-auto max-w-4xl space-y-6 px-4 pt-6 sm:pt-8">
        {/* Header Utama */}
        <header className="text-center sm:text-left">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            Pusat Bantuan & Dokumentasi
          </span>
          <h1 className="mt-2 font-display text-2xl font-extrabold text-foreground sm:text-3xl">
            Panduan Buku Tamu Menara Nobu
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Informasi panduan penggunaan aplikasi untuk pengunjung dan staf gedung telah dipisahkan
            dari dokumentasi teknis agar mudah dipahami.
          </p>
        </header>

        {/* Tab Navigasi Pemisah Panduan Web vs Info Teknis */}
        <div className="flex w-full rounded-2xl bg-muted/60 p-1.5 shadow-inner">
          <button
            onClick={() => setTab("user")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all sm:text-sm ${
              tab === "user"
                ? "bg-card text-primary shadow-soft"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookOpen className="h-4 w-4 shrink-0" />
            <span>Panduan Penggunaan Web</span>
          </button>
          <button
            onClick={() => setTab("tech")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all sm:text-sm ${
              tab === "tech"
                ? "bg-card text-primary shadow-soft"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Code2 className="h-4 w-4 shrink-0" />
            <span>Dokumentasi Teknis & IT</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: PANDUAN PENGGUNAAN WEB (USER & OPERASIONAL)      */}
        {/* ======================================================== */}
        {tab === "user" && (
          <div className="fade-up space-y-6">
            {/* Banner Pengantar */}
            <div className="rounded-2xl border border-brand bg-brand-soft p-5 text-foreground">
              <p className="font-semibold text-primary">👋 Selamat Datang di Menara Nobu</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                Sistem Buku Tamu Digital ini menggantikan buku fisik guna mempercepat proses lobi,
                menjaga privasi nomor telepon tamu, dan langsung memberi notifikasi ke karyawan yang
                bersangkutan.
              </p>
            </div>

            {/* 1. Alur Tamu / Pengunjung */}
            <section className={cardStyle}>
              <div className="flex items-center gap-3 border-b border-border pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-primary">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-foreground">
                    1. Alur Pengisian Tamu / Pengunjung
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Dilakukan mandiri oleh tamu melalui ponsel atau tablet resepsionis
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border/80 bg-background p-3.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    1
                  </span>
                  <p className="mt-2 font-semibold text-foreground text-sm">
                    Buka Halaman Registrasi
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Buka menu <b>Registrasi Tamu</b> pada menu atas atau scan QR Code yang tersedia
                    di meja resepsionis lobi.
                  </p>
                </div>

                <div className="rounded-xl border border-border/80 bg-background p-3.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    2
                  </span>
                  <p className="mt-2 font-semibold text-foreground text-sm">Isi Data Identitas</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ketik Nama Lengkap, Instansi / Perusahaan asal, dan nomor WhatsApp / HP aktif
                    untuk konfirmasi.
                  </p>
                </div>

                <div className="rounded-xl border border-border/80 bg-background p-3.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    3
                  </span>
                  <p className="mt-2 font-semibold text-foreground text-sm">
                    Pilih Tujuan & Karyawan
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Pilih keperluan kunjungan (Meeting, Interview, Dokumen, dll) serta cari nama
                    karyawan Bank Nobu yang dituju.
                  </p>
                </div>

                <div className="rounded-xl border border-border/80 bg-background p-3.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    4
                  </span>
                  <p className="mt-2 font-semibold text-foreground text-sm">Kirim Registrasi</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Tekan tombol <b>Kirim</b>. Sistem akan langsung mengirimkan notifikasi ke
                    karyawan tujuan dan konfirmasi berhasil akan muncul di layar.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
                <WifiOff className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                <span>
                  <b>Fitur Simpan Otomatis (Auto-Save):</b> Jika ponsel Anda tidak sengaja tertutup
                  atau jaringan melemah, data yang telah diketik tetap aman tersimpan di perangkat
                  dan dapat dilanjutkan kembali tanpa mengulang dari awal.
                </span>
              </div>
            </section>

            {/* 2. Alur Resepsionis Lobi */}
            <section className={cardStyle}>
              <div className="flex items-center gap-3 border-b border-border pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-foreground">
                    2. Alur Petugas Resepsionis & Keamanan Lobi
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Memandu pengunjung dan memverifikasi kehadiran di gedung
                  </p>
                </div>
              </div>

              <ul className="mt-4 space-y-2.5 text-sm text-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  <span>
                    <b>Penyambutan Tamu:</b> Mintalah tamu untuk mengisi buku tamu digital lewat
                    ponsel mereka atau perangkat tablet lobi.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  <span>
                    <b>Cek Data Tamu:</b> Buka menu <b>Admin → Data Tamu</b> untuk melihat daftar
                    tamu yang baru saja mendaftar secara langsung (real-time).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  <span>
                    <b>Pemberian Akses Masuk:</b> Berikan kartu pengunjung (*visitor badge*) sesuai
                    dengan divisi atau lantai yang dituju.
                  </span>
                </li>
              </ul>
            </section>

            {/* 3. Alur Karyawan */}
            <section className={cardStyle}>
              <div className="flex items-center gap-3 border-b border-border pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-primary">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-foreground">
                    3. Alur Staf & Karyawan Menara Nobu
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Menerima notifikasi kedatangan tamu dan memantau jadwal pertemuan
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <p>
                  Karyawan dapat masuk ke portal khusus di menu <b>Karyawan</b> (
                  <code>/karyawan</code>) menggunakan email kantor yang telah didaftarkan oleh
                  admin.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-border/70 bg-background p-3.5">
                    <p className="font-semibold text-foreground text-xs uppercase tracking-wider text-primary">
                      Notifikasi Otomatis
                    </p>
                    <p className="mt-1 text-xs">
                      Saat tamu tiba di resepsionis dan memilih nama Anda, notifikasi seketika
                      muncul di layar portal Anda.
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background p-3.5">
                    <p className="font-semibold text-foreground text-xs uppercase tracking-wider text-primary">
                      Pengingat Jadwal Penting
                    </p>
                    <p className="mt-1 text-xs">
                      Pertemuan penting yang dijadwalkan akan otomatis diberi tanda dan notifikasi
                      khusus agar Anda tidak terlewat.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* 4. Alur Admin & Laporan */}
            <section className={cardStyle}>
              <div className="flex items-center gap-3 border-b border-border pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-primary">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-foreground">
                    4. Alur Administrator & Rekapitulasi Laporan
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Analitik kunjungan, ekspor data CSV, dan pencetakan PDF
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3 text-sm text-foreground">
                <p className="text-xs text-muted-foreground">
                  Akses admin dapat dibuka melalui menu <b>Admin</b> (<code>/admin</code>):
                </p>
                <ul className="space-y-2 text-xs sm:text-sm">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-primary">•</span>
                    <span>
                      <b>Dashboard:</b> Memantau grafik tren kedatangan tamu (7, 30, atau 90 hari),
                      jam-jam tersibuk di gedung, dan durasi pengisian rata-rata.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-primary">•</span>
                    <span>
                      <b>
                        Menu Laporan (
                        <Link
                          to="/admin/laporan"
                          className="font-semibold text-primary underline inline-flex items-center gap-0.5"
                        >
                          /admin/laporan <ExternalLink className="h-3 w-3" />
                        </Link>
                        ):
                      </b>{" "}
                      Filter rentang tanggal fleksibel (Hari Ini, 7 Hari, 30 Hari, Bulan Ini) dengan
                      fitur <b>Ekspor CSV Excel</b> dan <b>Format Cetak / PDF</b>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-primary">•</span>
                    <span>
                      <b>Master Karyawan & Tujuan:</b> Mengatur daftar karyawan aktif, divisi, serta
                      kategori keperluan kunjungan gedung.
                    </span>
                  </li>
                </ul>
              </div>
            </section>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: DOKUMENTASI TEKNIS & IT (ARSITEKTUR & SETUP)     */}
        {/* ======================================================== */}
        {tab === "tech" && (
          <div className="fade-up space-y-6">
            <div className="rounded-2xl border border-border bg-muted/40 p-5 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">
                🛠️ Khusus Tim IT, Pengembang & Administrator Sistem
              </p>
              <p className="mt-1 text-xs">
                Halaman ini berisi arsitektur kode, skema basis data, variabel lingkungan, aturan
                keamanan RLS, dan alat pengujian koneksi database Supabase.
              </p>
            </div>

            {/* 1. Stack Teknologi & Hosting */}
            <section className={cardStyle}>
              <div className="flex items-center gap-3 border-b border-border pb-3">
                <Server className="h-5 w-5 text-primary" />
                <h2 className="font-display text-base font-bold text-foreground">
                  1. Spesifikasi Stack & Hosting Live
                </h2>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 text-xs">
                <div className="rounded-xl border border-border/80 bg-background p-3">
                  <p className="font-bold text-primary">Frontend Web Application</p>
                  <p className="mt-1 text-muted-foreground">
                    React 19, TanStack Start & Router, Tailwind CSS v4, Lucide Icons, Recharts.
                  </p>
                </div>
                <div className="rounded-xl border border-border/80 bg-background p-3">
                  <p className="font-bold text-primary">Backend Database & Auth</p>
                  <p className="mt-1 text-muted-foreground">
                    Supabase (PostgreSQL 15+, Row Level Security, Auth PKCE, Security Definer RPC).
                  </p>
                </div>
              </div>
              <div className="mt-3 rounded-xl bg-muted/40 p-3 text-xs">
                <p className="text-muted-foreground">
                  <b>Domain Produksi Live:</b>{" "}
                  <a
                    href="https://register-menara-nobu.vercel.app"
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-primary underline"
                  >
                    https://register-menara-nobu.vercel.app
                  </a>
                </p>
                <p className="mt-1 text-muted-foreground">
                  <b>Link Langsung Laporan:</b>{" "}
                  <a
                    href="https://register-menara-nobu.vercel.app/admin/laporan"
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-primary underline"
                  >
                    https://register-menara-nobu.vercel.app/admin/laporan
                  </a>
                </p>
              </div>
            </section>

            {/* 2. Variabel Lingkungan & Vercel */}
            <section className={cardStyle}>
              <div className="flex items-center gap-3 border-b border-border pb-3">
                <Key className="h-5 w-5 text-primary" />
                <h2 className="font-display text-base font-bold text-foreground">
                  2. Konfigurasi Variabel Lingkungan (.env)
                </h2>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Pada dashboard Vercel (<b>Settings → Environment Variables</b>), pastikan dua
                variabel berikut disetel untuk lingkungan Production, Preview, dan Development:
              </p>
              <code className={codeStyle}>VITE_SUPABASE_URL = https://xxxx.supabase.co</code>
              <code className={codeStyle}>
                VITE_SUPABASE_ANON_KEY = (kunci publik anon Supabase)
              </code>
              <p className="mt-2 text-[11px] text-destructive">
                ⚠️ PERINGATAN: Jangan pernah menggunakan <code>service_role</code> key di sisi
                browser.
              </p>
            </section>

            {/* 3. Keamanan RLS & Skema */}
            <section className={cardStyle}>
              <div className="flex items-center gap-3 border-b border-border pb-3">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <h2 className="font-display text-base font-bold text-foreground">
                  3. Keamanan Data & Row Level Security (RLS)
                </h2>
              </div>
              <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                <p>
                  Aplikasi menerapkan arsitektur *Zero-Trust Client Access* di PostgreSQL Supabase:
                </p>
                <ul className="list-inside list-disc space-y-1">
                  <li>
                    <b>Tamu Umum (Anon):</b> Tidak memiliki izin <code>SELECT</code> pada tabel{" "}
                    <code>guests</code>. Tamu hanya diizinkan memanggil fungsi tersimpan (RPC){" "}
                    <code>submit_guest</code> dan <code>upsert_draft</code>.
                  </li>
                  <li>
                    <b>Administrator:</b> Peran admin disimpan di tabel terpisah{" "}
                    <code>user_roles</code> (bukan di profil publik) agar hak akses tidak dapat
                    dimanipulasi dari sisi klien.
                  </li>
                  <li>
                    <b>Rate Limiting Login:</b> Proteksi anti brute-force otomatis mengunci akun
                    selama 15 menit jika terdeteksi 5 kali gagal login berturut-turut.
                  </li>
                </ul>
              </div>
            </section>

            {/* 4. Pemeriksaan Koneksi Sistem Live */}
            <section className={cardStyle}>
              <div className="flex items-center gap-3 border-b border-border pb-3">
                <Database className="h-5 w-5 text-primary" />
                <div>
                  <h2 className="font-display text-base font-bold text-foreground">
                    4. Pemeriksaan Koneksi Sistem Live
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Uji langsung konektivitas API Supabase, RLS data tamu, dan RPC functions
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <button
                  onClick={run}
                  disabled={running}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-6 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:brightness-110 active:scale-95 disabled:opacity-60 sm:text-sm"
                >
                  <Database className="h-4 w-4" />
                  {running ? "Memeriksa Koneksi…" : "Cek Koneksi Sekarang"}
                </button>

                {checks.length > 0 && (
                  <ul className="mt-4 space-y-2.5">
                    {checks.map((c) => (
                      <li
                        key={c.label}
                        className="flex items-start gap-3 rounded-xl border border-border/80 bg-background p-3.5"
                      >
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            c.ok
                              ? "bg-brand text-foreground"
                              : "bg-destructive text-primary-foreground"
                          }`}
                        >
                          {c.ok ? "✓" : "!"}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground sm:text-sm">{c.label}</p>
                          <p className="break-all text-xs text-muted-foreground">{c.note}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
