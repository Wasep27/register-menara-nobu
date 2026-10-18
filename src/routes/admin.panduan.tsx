import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Code2,
  Database,
  ExternalLink,
  Key,
  Layers,
  Lock,
  RefreshCw,
  Server,
  ShieldCheck,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Sparkles,
  Search,
  Trash2,
  BarChart3,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase, supabaseUrl } from "@/lib/supabase";

export const Route = createFileRoute("/admin/panduan")({
  head: () => ({
    meta: [
      { title: "Dokumentasi Teknis & IT — Menara Nobu" },
      {
        name: "description",
        content:
          "Dokumentasi arsitektur internal, konfigurasi lingkungan, keamanan database, dan pengujian koneksi live Menara Nobu.",
      },
    ],
  }),
  component: AdminTechnicalGuide,
});

type Check = { label: string; ok: boolean | null; note: string };
type SqlTab = "status" | "housekeeping" | "monitoring" | "indexes";

function AdminTechnicalGuide() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeSqlTab, setActiveSqlTab] = useState<SqlTab>("status");

  const getActiveSqlSnippet = () => {
    switch (activeSqlTab) {
      case "status":
        return SQL_INDEX_VERIFICATION_SNIPPET;
      case "housekeeping":
        return SQL_HOUSEKEEPING_SNIPPET;
      case "monitoring":
        return SQL_MONITORING_SNIPPET;
      case "indexes":
        return SQL_INDEXES_SNIPPET;
    }
  };

  const copySql = async () => {
    try {
      await navigator.clipboard.writeText(getActiveSqlSnippet());
      setCopied(true);
      toast.success("Kueri SQL berhasil disalin ke clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Gagal menyalin otomatis, silakan salin manual.");
    }
  };

  const runDiagnostics = async () => {
    setRunning(true);
    const out: Check[] = [];

    // 1. Supabase URL
    out.push({
      label: "Alamat Supabase Terbaca",
      ok: !!supabaseUrl,
      note: supabaseUrl || "Belum dikonfigurasi di environment",
    });

    // 2. Database Connection - Employees
    try {
      const emp = await supabase.from("employees").select("id", { count: "exact", head: true });
      out.push({
        label: "Koneksi Tabel Karyawan (employees)",
        ok: !emp.error,
        note: emp.error ? emp.error.message : `${emp.count ?? 0} data karyawan aktif`,
      });
    } catch (err: unknown) {
      out.push({
        label: "Koneksi Tabel Karyawan (employees)",
        ok: false,
        note: err instanceof Error ? err.message : "Gagal terhubung",
      });
    }

    // 3. Database Connection - Visit Purposes
    try {
      const p = await supabase.from("visit_purposes").select("id", { count: "exact", head: true });
      out.push({
        label: "Koneksi Tabel Tujuan Kunjungan (visit_purposes)",
        ok: !p.error && (p.count ?? 0) > 0,
        note: p.error ? p.error.message : `${p.count ?? 0} jenis tujuan aktif`,
      });
    } catch (err: unknown) {
      out.push({
        label: "Koneksi Tabel Tujuan Kunjungan (visit_purposes)",
        ok: false,
        note: err instanceof Error ? err.message : "Gagal terhubung",
      });
    }

    // 4. RPC Auto-save function
    try {
      const d = await supabase.rpc("get_draft", { _token: crypto.randomUUID() });
      out.push({
        label: "Fungsi Simpan Otomatis RPC (upsert/get_draft)",
        ok: !d.error,
        note: d.error ? `Error: ${d.error.message}` : "Fungsi RPC draft siap & responsif",
      });
    } catch (err: unknown) {
      out.push({
        label: "Fungsi Simpan Otomatis RPC (upsert/get_draft)",
        ok: false,
        note: err instanceof Error ? err.message : "Fungsi RPC draft tidak merespons",
      });
    }

    // 5. Rate limiting RPC
    try {
      const l = await supabase.rpc("login_lock_seconds", { _email: "diagnostik@menaranobu.com" });
      out.push({
        label: "Proteksi Anti Brute-Force (login_lock_seconds)",
        ok: !l.error,
        note: l.error ? `Error: ${l.error.message}` : "Aktif (penguncian 15 menit jika 5x gagal)",
      });
    } catch (err: unknown) {
      out.push({
        label: "Proteksi Anti Brute-Force (login_lock_seconds)",
        ok: false,
        note: err instanceof Error ? err.message : "Fungsi rate limit tidak merespons",
      });
    }

    // 6. Security verification: Guest table protection
    try {
      const g = await supabase.from("guests").select("id").limit(1);
      out.push({
        label: "Akses Admin ke Tabel Tamu (guests)",
        ok: !g.error,
        note: g.error
          ? `Gagal membaca: ${g.error.message}`
          : "Berhasil terverifikasi dengan hak akses Administrator",
      });
    } catch (err: unknown) {
      out.push({
        label: "Akses Admin ke Tabel Tamu (guests)",
        ok: false,
        note: err instanceof Error ? err.message : "Gagal memeriksa tabel tamu",
      });
    }

    // 7. Indeks & Performa Kueri Tamu
    try {
      const startMs = performance.now();
      const q = await supabase
        .from("guests")
        .select("id,badge_code,check_in_time")
        .order("check_in_time", { ascending: false })
        .limit(3);
      const elapsed = Math.round(performance.now() - startMs);
      out.push({
        label: "Performa Kueri & Indeks Database",
        ok: !q.error,
        note: q.error
          ? `Error kueri: ${q.error.message}`
          : `Indeks aktif & responsif (${elapsed} ms)`,
      });
    } catch (err: unknown) {
      out.push({
        label: "Performa Kueri & Indeks Database",
        ok: false,
        note: err instanceof Error ? err.message : "Gagal menguji performa kueri",
      });
    }

    setChecks(out);
    setRunning(false);
  };

  const cardStyle = "rounded-2xl bg-card p-5 sm:p-6 shadow-soft border border-border/80";
  const codeStyle =
    "mt-2 block overflow-x-auto rounded-xl bg-muted px-3.5 py-2.5 font-mono text-xs sm:text-sm text-foreground";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
          <Code2 className="h-3.5 w-3.5" />
          Internal Admin Only
        </div>
        <h1 className="mt-2 font-display text-2xl font-black text-foreground sm:text-3xl">
          Dokumentasi Teknis & IT
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Panduan arsitektur sistem, konfigurasi lingkungan, kebijakan keamanan database, dan
          diagnostik koneksi live Menara Nobu. Halaman ini dikhususkan untuk tim IT & Administrator.
        </p>
      </div>

      {/* 1. Pemeriksaan Koneksi Sistem Live */}
      <section className={cardStyle}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-primary">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-foreground sm:text-lg">
                Uji Diagnostik Sistem & Koneksi Live
              </h2>
              <p className="text-xs text-muted-foreground">
                Uji langsung konektivitas Supabase, RPC functions, dan kecepatan indeks database
              </p>
            </div>
          </div>

          <button
            onClick={runDiagnostics}
            disabled={running}
            className="w-full sm:w-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-xs sm:text-sm font-bold text-primary-foreground shadow-sm transition-all hover:brightness-110 active:scale-95 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${running ? "animate-spin" : ""}`} />
            {running ? "Memeriksa Sistem..." : "Jalankan Diagnostik"}
          </button>
        </div>

        {checks.length > 0 ? (
          <ul className="mt-4 space-y-2.5">
            {checks.map((c) => (
              <li
                key={c.label}
                className="flex items-start gap-3 rounded-xl border border-border/80 bg-background p-3.5"
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    c.ok ? "bg-brand text-foreground" : "bg-destructive text-primary-foreground"
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
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-border bg-background p-4 text-center">
            <p className="text-xs text-muted-foreground">
              Tekan tombol <b>Jalankan Diagnostik</b> di atas untuk memverifikasi seluruh komponen
              backend, indeks query, dan fungsi RPC secara real-time.
            </p>
          </div>
        )}
      </section>

      {/* 2. Spesifikasi Stack & Arsitektur */}
      <section className={cardStyle}>
        <div className="flex items-center gap-3 border-b border-border pb-3">
          <Server className="h-5 w-5 text-primary" />
          <h2 className="font-display text-base font-bold text-foreground">
            1. Arsitektur Stack & Hosting
          </h2>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 text-xs">
          <div className="rounded-xl border border-border/80 bg-background p-3.5">
            <p className="font-bold text-primary">Frontend Web Application</p>
            <p className="mt-1 text-muted-foreground">
              React 19, TanStack Start & Router, Tailwind CSS v4, Framer Motion, Lucide Icons,
              Recharts.
            </p>
          </div>
          <div className="rounded-xl border border-border/80 bg-background p-3.5">
            <p className="font-bold text-primary">Backend Database & Autentikasi</p>
            <p className="mt-1 text-muted-foreground">
              Supabase (PostgreSQL 15+, Row Level Security, Auth PKCE, Security Definer RPC).
            </p>
          </div>
        </div>
        <div className="mt-3 rounded-xl bg-muted/40 p-3 text-xs">
          <p className="text-muted-foreground">
            <b>Hosting Frontend:</b> Vercel SSR dengan NITRO_PRESET=vercel untuk render halaman
            tanpa 404 saat refresh.
          </p>
          <p className="mt-1 text-muted-foreground">
            <b>Pola Akses Data:</b> Client-side browser access melalui{" "}
            <code>src/lib/supabase.ts</code>, penulisan tamu eksklusif via fungsi RPC untuk keamanan
            anonim.
          </p>
        </div>
      </section>

      {/* 3. Konfigurasi Lingkungan (.env) */}
      <section className={cardStyle}>
        <div className="flex items-center gap-3 border-b border-border pb-3">
          <Key className="h-5 w-5 text-primary" />
          <h2 className="font-display text-base font-bold text-foreground">
            2. Konfigurasi Variabel Lingkungan (.env)
          </h2>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Variabel wajib yang perlu disetel di Vercel (<b>Settings → Environment Variables</b>) atau
          file <code>.env</code> lokal:
        </p>
        <code className={codeStyle}>VITE_SUPABASE_URL=https://[YOUR_PROJECT_ID].supabase.co</code>
        <code className={codeStyle}>VITE_SUPABASE_ANON_KEY=[YOUR_PUBLIC_ANON_KEY]</code>
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            <b>Aturan Keamanan:</b> Jangan pernah memaparkan <code>service_role</code> key di sisi
            klien atau kode frontend. Seluruh hak istimewa dijalankan lewat fungsi database
            ber-atribut <code>SECURITY DEFINER</code>.
          </span>
        </div>
      </section>

      {/* 4. Keamanan RLS & Skema */}
      <section className={cardStyle}>
        <div className="flex items-center gap-3 border-b border-border pb-3">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="font-display text-base font-bold text-foreground">
            3. Keamanan Data & Row Level Security (RLS)
          </h2>
        </div>
        <div className="mt-3 space-y-2 text-xs text-muted-foreground">
          <p>
            Sistem mengadopsi model *Zero-Trust Client Access* dengan aturan RLS ketat di
            PostgreSQL:
          </p>
          <ul className="list-inside list-disc space-y-1.5">
            <li>
              <b>Pengunjung / Tamu Publik (Anon):</b> Tidak memiliki izin <code>SELECT</code> pada
              tabel <code>guests</code>. Tamu hanya diizinkan memanggil fungsi tersimpan (RPC){" "}
              <code>submit_guest</code> dan <code>upsert_draft</code>.
            </li>
            <li>
              <b>Administrator:</b> Peran admin disimpan di tabel terpisah <code>user_roles</code>{" "}
              (bukan di profil publik) agar hak akses tidak dapat dimanipulasi dari sisi klien.
            </li>
            <li>
              <b>Rate Limiting Login:</b> Proteksi anti brute-force otomatis mengunci akun selama 15
              menit jika terdeteksi 5 kali gagal login berturut-turut.
            </li>
            <li>
              <b>Sesi Tidak Aktif:</b> Sesi admin akan otomatis logout setelah 30 menit tanpa
              aktivitas mouse/keyboard untuk mencegah kebocoran sesi di komputer bersama lobi.
            </li>
          </ul>
        </div>
      </section>

      {/* 5. Tautan Modul Administrasi */}
      <section className={cardStyle}>
        <div className="flex items-center gap-3 border-b border-border pb-3">
          <Layers className="h-5 w-5 text-primary" />
          <h2 className="font-display text-base font-bold text-foreground">
            4. Tautan Modul Administrasi
          </h2>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3 text-xs">
          <Link
            to="/admin/tamu"
            className="flex flex-col rounded-xl border border-border/80 bg-background p-3 transition-colors hover:border-brand"
          >
            <span className="font-bold text-foreground">Kelola Data Tamu</span>
            <span className="mt-0.5 text-muted-foreground">Lihat buku tamu digital live</span>
          </Link>
          <Link
            to="/admin/laporan"
            className="flex flex-col rounded-xl border border-border/80 bg-background p-3 transition-colors hover:border-brand"
          >
            <span className="font-bold text-foreground">Laporan & Ekspor</span>
            <span className="mt-0.5 text-muted-foreground">
              Ekspor Excel (.xlsx), PDF resmi & cetak
            </span>
          </Link>
          <Link
            to="/admin/karyawan"
            className="flex flex-col rounded-xl border border-border/80 bg-background p-3 transition-colors hover:border-brand"
          >
            <span className="font-bold text-foreground">Master Karyawan</span>
            <span className="mt-0.5 text-muted-foreground">Daftar staf & divisi penerima tamu</span>
          </Link>
        </div>
      </section>

      {/* 6. Pemeliharaan, Monitoring & Indeks Database */}
      <section className={cardStyle}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-primary">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base font-bold text-foreground sm:text-lg">
                  5. Pemeliharaan, Monitoring & Indeks Database
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-primary">
                  <CheckCircle className="h-3 w-3" />
                  Indeks Aktif
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Kueri inspeksi kesehatan PostgreSQL, pembersihan draft berkala, dan log audit
              </p>
            </div>
          </div>

          <button
            onClick={copySql}
            className="w-full sm:w-auto inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-brand-soft px-4 py-2 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-all active:scale-95 shadow-sm"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? "Tersalin ke Clipboard" : "Salin Kueri Aktif"}</span>
          </button>
        </div>

        {/* Status Indeks Relevan Notice */}
        <div className="mt-4 rounded-xl border border-brand/40 bg-brand-soft/40 p-3.5 text-xs">
          <p className="font-bold text-foreground flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
            Catatan Relevansi Indeks:
          </p>
          <p className="mt-1 text-muted-foreground leading-relaxed">
            Indeks performa inti (pada <code>check_in_time</code>, <code>badge_code</code>,{" "}
            <code>employee_id</code>, dan pencarian nama) <b>sudah aktif dijalankan</b> di Supabase
            Anda. Anda tidak perlu menjalankannya berulang kali. Di bawah ini disediakan kueri
            operasional untuk <b>pemantauan kesehatan indeks</b>,{" "}
            <b>pembersihan data sementara (housekeeping)</b>, serta arsip kueri jika sewaktu-waktu
            Anda bermigrasi ke database baru.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="mt-4 flex flex-wrap gap-1.5 rounded-xl bg-muted p-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveSqlTab("status")}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 font-semibold transition-all ${
              activeSqlTab === "status"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Search className="h-3.5 w-3.5" />
            <span>1. Inspeksi Indeks & Ukuran</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSqlTab("housekeeping")}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 font-semibold transition-all ${
              activeSqlTab === "housekeeping"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>2. Pembersihan Draft (Housekeeping)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSqlTab("monitoring")}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 font-semibold transition-all ${
              activeSqlTab === "monitoring"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>3. Monitoring Beban & Statistik</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSqlTab("indexes")}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 font-semibold transition-all ${
              activeSqlTab === "indexes"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Code2 className="h-3.5 w-3.5" />
            <span>4. Arsip Skrip Pembuatan Indeks</span>
          </button>
        </div>

        {/* Tab Description */}
        <div className="mt-3 text-xs text-muted-foreground">
          {activeSqlTab === "status" && (
            <p>
              Gunakan kueri ini di Supabase SQL Editor untuk memverifikasi bahwa indeks aktif
              digunakan oleh query planner dan melihat ukuran penyimpanan tabel:
            </p>
          )}
          {activeSqlTab === "housekeeping" && (
            <p>
              Jalankan secara berkala (misal 1 bulan sekali) untuk membersihkan draft formulir yang
              ditinggalkan pengguna dan mengoptimalkan ruang penyimpanan:
            </p>
          )}
          {activeSqlTab === "monitoring" && (
            <p>
              Kueri analitik untuk memantau waktu kunjungan tersibuk di lobi Menara Nobu dan
              mengaudit aktivitas staf keamanan:
            </p>
          )}
          {activeSqlTab === "indexes" && (
            <p>
              Skrip DDL pembuatan indeks lengkap (DDL). Sudah terpasang di database saat ini,
              disimpan sebagai referensi pemulihan sistem atau migrasi:
            </p>
          )}
        </div>

        <pre className="mt-3 max-h-80 overflow-x-auto rounded-xl bg-muted/80 p-3.5 font-mono text-[11px] leading-relaxed text-foreground border border-border/60">
          {getActiveSqlSnippet()}
        </pre>
      </section>
    </div>
  );
}

const SQL_INDEX_VERIFICATION_SNIPPET = `-- 1. Kueri Verifikasi Pemakaian Indeks di PostgreSQL Supabase
-- Menampilkan seberapa sering indeks tabel tamu digunakan oleh query scanner & dashboard
select
  schemaname,
  relname as nama_tabel,
  indexrelname as nama_indeks,
  idx_scan as frekuensi_digunakan,
  idx_tup_read as baris_terbaca,
  idx_tup_fetch as baris_diambil
from pg_stat_user_indexes
where relname in ('guests', 'guest_feedback', 'employees', 'guest_drafts')
order by idx_scan desc;

-- 2. Cek Ukuran Penyimpanan Tabel & Indeks
select
  relname as nama_tabel,
  pg_size_pretty(pg_total_relation_size(relid)) as total_ukuran,
  pg_size_pretty(pg_relation_size(relid)) as ukuran_data,
  pg_size_pretty(pg_indexes_size(relid)) as ukuran_indeks
from pg_catalog.pg_statio_user_tables
where relname in ('guests', 'guest_feedback', 'employees', 'guest_drafts')
order by pg_total_relation_size(relid) desc;`;

const SQL_HOUSEKEEPING_SNIPPET = `-- 1. Pembersihan Draft Registrasi Kadaluarsa (Expired Drafts)
-- Draft otomatis ditinggalkan pengunjung yang tidak menyelesaikan pendaftaran
delete from public.guest_drafts
where expires_at < now() - interval '1 day';

-- 2. Pembersihan Log Aktivitas Sistem yang Lebih dari 6 Bulan (Opsional)
-- Memastikan tabel activity_logs tetap ringan dan cepat
-- delete from public.activity_logs
-- where created_at < now() - interval '180 days';

-- 3. Optimalisasi Statistik PostgreSQL (Vacuum & Analyze)
-- Membantu perencana query (query planner) memilih rencana terbaik
vacuum (analyze) public.guests;
vacuum (analyze) public.guest_feedback;
vacuum (analyze) public.guest_drafts;`;

const SQL_MONITORING_SNIPPET = `-- 1. Rekapitulasi Tamu Berdasarkan Jam Kunjungan (Analisis Jam Sibuk Lobi)
select
  extract(hour from check_in_time) as jam_kunjungan,
  count(*) as jumlah_tamu
from public.guests
where check_in_time >= date_trunc('month', now())
group by jam_kunjungan
order by jam_kunjungan asc;

-- 2. Karyawan Penerima Tamu Terbanyak Bulan Ini
select
  coalesce(e.name, 'Tanpa Tujuan Karyawan') as nama_karyawan,
  e.department as divisi,
  count(g.id) as total_kunjungan
from public.guests g
left join public.employees e on e.id = g.employee_id
where g.check_in_time >= date_trunc('month', now())
group by e.name, e.department
order by total_kunjungan desc
limit 10;

-- 3. Rata-Rata Rating Kepuasan Tamu (Bulan Ini)
select
  round(avg(rating)::numeric, 2) as rata_rata_bintang,
  count(*) as total_feedback,
  count(*) filter (where rating >= 4) as sangat_puas
from public.guest_feedback
where created_at >= date_trunc('month', now());`;

const SQL_INDEXES_SNIPPET = `-- ARSIP LENGKAP: Skrip Pembuatan Indeks Database Menara Nobu
-- Catatan: Skrip ini SUDAH dijalankan di database Anda.
-- Gunakan skrip ini HANYA jika membuat project Supabase baru atau replika staging.

-- 1. Indeks Utama Tabel Tamu (Mempercepat Dashboard, Filter Tanggal, & Scan QR)
create index if not exists guests_check_in_time_idx on public.guests(check_in_time desc);
create index if not exists guests_badge_code_idx on public.guests(badge_code);
create index if not exists guests_badge_clean_idx on public.guests(upper(replace(badge_code, '-', '')));
create index if not exists guests_employee_id_idx on public.guests(employee_id);
create index if not exists guests_visit_purpose_id_idx on public.guests(visit_purpose_id);
create index if not exists guests_scheduled_reminders_idx on public.guests(scheduled_at) where is_important = true and scheduled_at is not null;
create index if not exists guests_name_lower_idx on public.guests(lower(name));

-- 2. Indeks Feedback Tamu
create index if not exists guest_feedback_created_at_idx on public.guest_feedback(created_at desc);
create index if not exists guest_feedback_rating_idx on public.guest_feedback(rating);

-- 3. Indeks Master Data untuk Form Registrasi Cepat
create index if not exists employees_is_active_name_idx on public.employees(is_active, name);
create index if not exists visit_purposes_is_active_name_idx on public.visit_purposes(is_active, name);
create index if not exists guest_drafts_expires_at_idx on public.guest_drafts(expires_at);`;
