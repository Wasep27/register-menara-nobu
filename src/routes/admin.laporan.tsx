import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertCircle,
  Calendar,
  CalendarRange,
  CalendarX,
  Download,
  FileSpreadsheet,
  Printer,
  Search,
  Sparkles,
} from "lucide-react";
import { supabase, type Guest } from "@/lib/supabase";
import { exportToCsv } from "@/lib/csv-export";
import { formatWibDateTime } from "@/lib/date-utils";

export const Route = createFileRoute("/admin/laporan")({ component: Report });

function Report() {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [dateError, setDateError] = useState("");
  const [rows, setRows] = useState<Guest[] | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFromChange = (val: string) => {
    setFrom(val);
    if (!val) {
      setDateError("Tanggal awal tidak boleh kosong.");
    } else if (to && val > to) {
      setDateError("Tanggal awal tidak boleh lebih besar dari tanggal akhir.");
    } else {
      setDateError("");
    }
  };

  const handleToChange = (val: string) => {
    setTo(val);
    if (!val) {
      setDateError("Tanggal akhir tidak boleh kosong.");
    } else if (from && val < from) {
      setDateError("Tanggal akhir tidak boleh lebih awal dari tanggal awal.");
    } else {
      setDateError("");
    }
  };

  const loadRange = async (f: string, t: string) => {
    if (!f || !t) {
      setDateError("Harap tentukan tanggal awal dan tanggal akhir.");
      return;
    }
    if (f > t) {
      setDateError("Tanggal awal tidak boleh lebih besar dari tanggal akhir.");
      return;
    }
    setDateError("");
    setLoading(true);
    setFrom(f);
    setTo(t);
    const e = new Date(t);
    e.setDate(e.getDate() + 1);
    const { data } = await supabase
      .from("guests")
      .select("*, employees(name), visit_purposes(name)")
      .gte("check_in_time", new Date(f).toISOString())
      .lt("check_in_time", e.toISOString())
      .order("check_in_time");
    setRows((data as Guest[]) ?? []);
    setLoading(false);
  };

  const load = () => loadRange(from, to);

  const applyPreset = (days: number) => {
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    const f = start.toISOString().slice(0, 10);
    loadRange(f, today);
  };

  const applyCurrentMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    loadRange(firstDay, today);
  };

  const csv = () => {
    if (!rows || rows.length === 0) return;
    exportToCsv({
      filename: `laporan-tamu-${from}-${to}`,
      headers: [
        "Waktu",
        "Nama",
        "Instansi",
        "Telepon",
        "Tujuan",
        "Dituju",
        "Catatan",
        "Durasi isi (detik)",
      ],
      rows: rows.map((r) => [
        formatWibDateTime(r.check_in_time),
        r.name,
        r.institution,
        r.phone,
        r.visit_purposes?.name || "-",
        r.employees?.name || "-",
        r.notes || "",
        r.fill_duration_seconds ?? "",
      ]),
    });
  };
  const i = "rounded-lg border border-input bg-card px-3 py-2 text-sm";
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">Laporan</h1>
        <p className="text-sm text-muted-foreground">
          Rekapitulasi data tamu dan ekspor laporan berkala.
        </p>
      </div>

      {/* Form Input Rentang Tanggal — Responsif Penuh di Ukuran Mobile */}
      <div className="rounded-2xl bg-card p-4 shadow-soft sm:p-5 print:hidden">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:items-end">
          <div className="flex-1">
            <label
              htmlFor="from-date"
              className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-foreground"
            >
              <Calendar className="h-3.5 w-3.5 text-primary" />
              Dari Tanggal
            </label>
            <input
              id="from-date"
              type="date"
              className={`w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 ${
                dateError
                  ? "border-destructive text-destructive focus:border-destructive focus:ring-destructive/20"
                  : "border-input text-foreground focus:border-brand focus:ring-brand/25"
              }`}
              value={from}
              onChange={(e) => handleFromChange(e.target.value)}
            />
          </div>

          <div className="flex-1">
            <label
              htmlFor="to-date"
              className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-foreground"
            >
              <Calendar className="h-3.5 w-3.5 text-primary" />
              Sampai Tanggal
            </label>
            <input
              id="to-date"
              type="date"
              className={`w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 ${
                dateError
                  ? "border-destructive text-destructive focus:border-destructive focus:ring-destructive/20"
                  : "border-input text-foreground focus:border-brand focus:ring-brand/25"
              }`}
              value={to}
              onChange={(e) => handleToChange(e.target.value)}
            />
          </div>

          <button
            disabled={loading || !!dateError}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            onClick={load}
          >
            <Search className="h-4 w-4" />
            {loading ? "Memuat…" : "Tampilkan Laporan"}
          </button>
        </div>

        {/* Pesan Validasi Rentang Tanggal */}
        {dateError && (
          <div
            role="alert"
            className="fade-up mt-3 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive sm:text-sm"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{dateError}</span>
          </div>
        )}

        {/* Tombol Ekspor & Cetak saat Data Ditampilkan */}
        {rows && (
          <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-end">
            <button
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted active:scale-95 sm:text-sm"
              onClick={csv}
            >
              <Download className="h-4 w-4 text-primary" />
              Ekspor CSV
            </button>
            <button
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted active:scale-95 sm:text-sm"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4 text-primary" />
              Cetak / PDF
            </button>
          </div>
        )}
      </div>

      {/* Empty State Interaktif, Beranimasi Ringan & Profesional Saat Belum Ada Laporan Ditampilkan */}
      {rows === null && (
        <div className="fade-up relative overflow-hidden rounded-3xl border border-border/80 bg-card p-6 text-center shadow-soft sm:p-10">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand/10 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl"
          />

          <div className="relative mx-auto flex max-w-md flex-col items-center">
            {/* Animasi Ringan Icon Floating Modern */}
            <div className="relative mb-5">
              <div className="float-subtle flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft text-primary shadow-soft sm:h-20 sm:w-20">
                <FileSpreadsheet className="h-8 w-8 sm:h-10 sm:w-10" />
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              Siap Merekapitulasi
            </span>

            <h2 className="mt-3 font-display text-xl font-extrabold text-foreground sm:text-2xl">
              Laporan Kunjungan Tamu
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              Tentukan rentang tanggal di atas untuk memuat daftar kunjungan, atau pilih salah satu
              jalan pintas periode populer di bawah untuk memuat data seketika.
            </p>

            {/* Fitur Utama */}
            <div className="mt-5 grid grid-cols-3 gap-2 w-full text-left">
              <div className="rounded-xl border border-border/60 bg-muted/30 p-2.5 text-center">
                <p className="font-display text-xs font-bold text-foreground">Rekap Lengkap</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">Detail tamu & instansi</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/30 p-2.5 text-center">
                <p className="font-display text-xs font-bold text-foreground">Ekspor Excel</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">Unduh format CSV</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/30 p-2.5 text-center">
                <p className="font-display text-xs font-bold text-foreground">Cetak / PDF</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">Format siap print</p>
              </div>
            </div>

            {/* Pilihan Pintas Cepat (Quick Presets) */}
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <button
                onClick={() => loadRange(today, today)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-background px-4 py-1.5 text-xs font-semibold text-foreground shadow-sm transition-all hover:bg-brand-soft hover:text-primary active:scale-95"
              >
                <CalendarRange className="h-3.5 w-3.5 text-primary" />
                Hari Ini
              </button>
              <button
                onClick={() => applyPreset(7)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-background px-4 py-1.5 text-xs font-semibold text-foreground shadow-sm transition-all hover:bg-brand-soft hover:text-primary active:scale-95"
              >
                <CalendarRange className="h-3.5 w-3.5 text-primary" />7 Hari Terakhir
              </button>
              <button
                onClick={() => applyPreset(30)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow-soft transition-transform hover:brightness-110 active:scale-95"
              >
                <CalendarRange className="h-3.5 w-3.5" />
                30 Hari Terakhir
              </button>
              <button
                onClick={applyCurrentMonth}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-background px-4 py-1.5 text-xs font-semibold text-foreground shadow-sm transition-all hover:bg-brand-soft hover:text-primary active:scale-95"
              >
                <CalendarRange className="h-3.5 w-3.5 text-primary" />
                Bulan Ini
              </button>
            </div>
          </div>
        </div>
      )}

      {rows !== null && (
        <div className="fade-up rounded-2xl bg-card p-5 shadow-soft">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <p className="text-sm font-medium text-foreground">
              Periode: <span className="font-bold text-primary">{from}</span> s/d{" "}
              <span className="font-bold text-primary">{to}</span>
            </p>
            <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-primary">
              Total {rows.length} tamu
            </span>
          </div>

          {loading ? (
            <div className="space-y-3 py-4" aria-busy="true">
              {[0, 1, 2, 3, 4].map((k) => (
                <div key={k} className="flex items-center gap-4 border-b border-border/60 p-3">
                  <div className="h-4 w-28 rounded-full skeleton-shimmer" />
                  <div className="h-4 w-36 rounded-full skeleton-shimmer" />
                  <div className="h-4 w-28 rounded-full skeleton-shimmer opacity-75" />
                  <div className="h-5 w-24 rounded-full skeleton-shimmer opacity-85" />
                  <div className="h-4 w-24 rounded-full skeleton-shimmer opacity-70" />
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-primary shadow-sm">
                <CalendarX className="h-7 w-7" />
              </div>
              <p className="mt-4 font-display text-base font-bold text-foreground">
                Tidak ada data pada periode ini
              </p>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                Tidak ada rekaman tamu antara tanggal {from} dan {to}. Coba perluas rentang tanggal.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => applyPreset(30)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-4 py-2 text-xs font-semibold text-primary transition-all hover:bg-primary hover:text-primary-foreground active:scale-95"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Coba 30 Hari Terakhir
                </button>
                <button
                  onClick={() => loadRange(today, today)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted active:scale-95"
                >
                  Lihat Hari Ini
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Kartu ringkas untuk ponsel */}
              <ul className="space-y-3 sm:hidden">
                {rows.map((r) => (
                  <li key={r.id} className="rounded-xl border border-border bg-background p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 truncate font-semibold text-foreground">{r.name}</p>
                      <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-primary">
                        {r.visit_purposes?.name ?? "-"}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">{r.institution}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatWibDateTime(r.check_in_time, false)}
                      {r.employees?.name ? ` · bertemu ${r.employees.name}` : ""}
                    </p>
                  </li>
                ))}
              </ul>

              {/* Tabel penuh untuk layar lebih besar */}
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="p-3">Waktu</th>
                      <th className="p-3">Nama</th>
                      <th className="p-3">Instansi</th>
                      <th className="p-3">Tujuan</th>
                      <th className="p-3">Dituju</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                        <td className="p-3 font-medium text-foreground">
                          {formatWibDateTime(r.check_in_time)}
                        </td>
                        <td className="p-3 font-semibold text-foreground">{r.name}</td>
                        <td className="p-3 text-muted-foreground">{r.institution}</td>
                        <td className="p-3">
                          <span className="inline-block rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-primary">
                            {r.visit_purposes?.name ?? "-"}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground">{r.employees?.name ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
