import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  RefreshCw,
  RotateCcw,
  SearchX,
  UserPlus,
  Users,
  IdCard,
  QrCode,
  Edit3,
  Trash2,
  FileSpreadsheet,
  FileText,
  Download,
} from "lucide-react";
import { supabase, type Employee, type Guest, type Purpose } from "@/lib/supabase";
import { VisitorBadgeModal } from "@/components/VisitorBadgeModal";
import { createVisitorBadgeFromGuest, type VisitorBadgeData } from "@/lib/badge-utils";
import { useAdminRole } from "@/hooks/useAdminRole";
import { exportToExcel, exportToPdf, exportToCsv } from "@/lib/export-utils";
import { formatWibDateTime } from "@/lib/date-utils";

export const Route = createFileRoute("/admin/tamu")({ component: Guests });
const PAGE = 20;

function Guests() {
  const { isAdmin, isSecurity, isStaff } = useAdminRole();
  const [rows, setRows] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  // Debounce search input to avoid firing database requests on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQ(q);
      setPage(0);
    }, 280);
    return () => clearTimeout(timer);
  }, [q]);

  const [date, setDate] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [purpose, setPurpose] = useState("");
  const [emp, setEmp] = useState("");
  const [asc, setAsc] = useState(false);
  const [emps, setEmps] = useState<Employee[]>([]);
  const [purps, setPurps] = useState<Purpose[]>([]);
  const [edit, setEdit] = useState<Guest | null>(null);
  const [badgeGuest, setBadgeGuest] = useState<VisitorBadgeData | null>(null);

  // Lock body scroll safely without losing scroll position on mobile for edit modal
  useEffect(() => {
    if (!edit) return;
    const scrollY = window.scrollY || window.pageYOffset;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalWidth = document.body.style.width;
    const originalOverflow = document.body.style.overflow;

    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.width = originalWidth;
      document.body.style.overflow = originalOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [edit]);

  const openBadgeModal = (r: Guest) => {
    setBadgeGuest(createVisitorBadgeFromGuest(r));
  };

  useEffect(() => {
    supabase
      .from("employees")
      .select("id, name, department, is_active")
      .order("name")
      .then(({ data }) => setEmps((data as Employee[]) ?? []));
    supabase
      .from("visit_purposes")
      .select("id, name, is_active")
      .order("name")
      .then(({ data }) => setPurps((data as Purpose[]) ?? []));
  }, []);

  const buildQuery = useCallback(() => {
    let qb = supabase
      .from("guests")
      .select("*, employees(name), visit_purposes(name)", { count: "exact" });
    const term = debouncedQ.replace(/[,()%*]/g, " ").trim();
    if (term) qb = qb.or(`name.ilike.%${term}%,institution.ilike.%${term}%,phone.ilike.%${term}%`);
    if (date) qb = qb.gte("check_in_time", new Date(`${date}T00:00:00`).toISOString());
    if (dateTo || date) {
      const e = new Date(`${dateTo || date}T00:00:00`);
      e.setDate(e.getDate() + 1);
      qb = qb.lt("check_in_time", e.toISOString());
    }
    if (purpose) qb = qb.eq("visit_purpose_id", purpose);
    if (emp === "__general__") {
      qb = qb.is("employee_id", null);
    } else if (emp) {
      qb = qb.eq("employee_id", emp);
    }
    return qb.order("check_in_time", { ascending: asc });
  }, [debouncedQ, date, dateTo, purpose, emp, asc]);

  const [exporting, setExporting] = useState<string | false>(false);

  const fetchAllData = async (): Promise<Guest[]> => {
    const all: Guest[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await buildQuery().range(from, from + 999);
      if (error) throw error;
      all.push(...((data as Guest[]) ?? []));
      if (!data || data.length < 1000) break;
    }
    return all;
  };

  const exportExcel = async () => {
    if (count === 0) return;
    setExporting("excel");
    try {
      const all = await fetchAllData();
      const todayStr = new Date().toISOString().slice(0, 10);
      exportToExcel({
        filename: `buku-tamu-menara-nobu-${todayStr}`,
        title: "Daftar Buku Tamu Menara Nobu",
        subtitle: "Gedung Perkantoran Menara Nobu · Pos Keamanan & Resepsionis",
        sheetName: "Buku Tamu",
        headers: [
          "No",
          "Waktu Masuk (WIB)",
          "Nama Tamu",
          "Instansi / Perusahaan",
          "Nomor Telepon",
          "Tujuan Kunjungan",
          "Menemui / Staf",
          "Catatan Kunjungan",
          "Durasi Pengisian (detik)",
        ],
        rows: all.map((r, idx) => [
          idx + 1,
          formatWibDateTime(r.check_in_time),
          r.name,
          r.institution,
          r.phone,
          r.visit_purposes?.name || "-",
          r.employees?.name || "Resepsionis Lobi (Umum)",
          r.notes || "-",
          r.fill_duration_seconds ?? "-",
        ]),
      });
      toast.success("Data buku tamu berhasil diekspor ke Excel (.xlsx)");
    } catch {
      toast.error("Gagal mengekspor data ke Excel");
    } finally {
      setExporting(false);
    }
  };

  const exportPdf = async () => {
    if (count === 0) return;
    setExporting("pdf");
    try {
      const all = await fetchAllData();
      const todayStr = new Date().toISOString().slice(0, 10);
      exportToPdf({
        filename: `buku-tamu-menara-nobu-${todayStr}`,
        title: "Daftar Rekapitulasi Tamu Menara Nobu",
        subtitle: "Pos Keamanan & Resepsionis Lobi Gedung Menara Nobu",
        headers: [
          "No",
          "Waktu",
          "Nama Tamu",
          "Instansi",
          "Telepon",
          "Tujuan",
          "Menemui",
          "Catatan",
        ],
        rows: all.map((r, idx) => [
          idx + 1,
          formatWibDateTime(r.check_in_time, false),
          r.name,
          r.institution,
          r.phone,
          r.visit_purposes?.name || "-",
          r.employees?.name || "Resepsionis Lobi (Umum)",
          r.notes || "-",
        ]),
      });
      toast.success("Dokumen PDF buku tamu berhasil diunduh");
    } catch {
      toast.error("Gagal mengekspor data ke PDF");
    } finally {
      setExporting(false);
    }
  };

  const exportCsv = async () => {
    if (count === 0) return;
    setExporting("csv");
    try {
      const all = await fetchAllData();
      exportToCsv({
        filename: `data-tamu-${new Date().toISOString().slice(0, 10)}`,
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
        rows: all.map((r) => [
          formatWibDateTime(r.check_in_time),
          r.name,
          r.institution,
          r.phone,
          r.visit_purposes?.name || "-",
          r.employees?.name || "Resepsionis Lobi (Umum)",
          r.notes || "",
          r.fill_duration_seconds ?? "",
        ]),
      });
      toast.success("Data buku tamu berhasil diekspor ke CSV");
    } catch {
      toast.error("Gagal mengekspor data tamu");
    } finally {
      setExporting(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    const { data, count } = await buildQuery().range(page * PAGE, page * PAGE + PAGE - 1);
    setRows((data as Guest[]) ?? []);
    setCount(count ?? 0);
    setLoading(false);
  }, [buildQuery, page]);
  useEffect(() => {
    load();
  }, [load]);

  const [toDelete, setToDelete] = useState<Guest | null>(null);
  const del = async () => {
    if (!toDelete) return;
    const { error } = await supabase.from("guests").delete().eq("id", toDelete.id);
    if (error) {
      toast.error("Gagal menghapus data tamu");
      return;
    }
    toast.success(`Data tamu ${toDelete.name} dihapus`);
    load();
  };
  const save = async () => {
    if (!edit) return;
    if (edit.name.trim().length < 2) {
      toast.error("Nama minimal 2 huruf");
      return;
    }
    const { error } = await supabase
      .from("guests")
      .update({
        name: edit.name,
        institution: edit.institution,
        phone: edit.phone,
        notes: edit.notes,
        employee_id:
          edit.employee_id && edit.employee_id !== "__general__" ? edit.employee_id : null,
        visit_purpose_id: edit.visit_purpose_id,
      })
      .eq("id", edit.id);
    if (error) {
      toast.error("Gagal menyimpan perubahan");
      return;
    }
    toast.success("Data tamu diperbarui");
    setEdit(null);
    load();
  };
  const i = "rounded-lg border border-input bg-card px-3 py-2 text-sm";

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Buku Tamu Menara Nobu</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isSecurity
              ? "Verifikasi kehadiran tamu, cek nomor tiket, dan cetak badge pengunjung di pos jaga."
              : "Daftar kehadiran dan rekam kunjungan pengunjung gedung Menara Nobu."}
          </p>
        </div>
        {!isSecurity && (
          <Link
            to="/registrasi"
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs sm:text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:brightness-110 active:scale-95 shrink-0"
          >
            <UserPlus className="h-4 w-4" />
            <span>+ Registrasi Tamu Baru</span>
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <input
          className={`${i} col-span-2 w-full sm:w-64`}
          type="search"
          placeholder="Cari nama / instansi / telepon"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(0);
          }}
        />
        <label className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
          Dari
          <input
            className={`${i} w-full`}
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setPage(0);
            }}
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
          Sampai
          <input
            className={`${i} w-full`}
            type="date"
            value={dateTo}
            min={date || undefined}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(0);
            }}
          />
        </label>
        <select
          className={`${i} col-span-2 w-full sm:col-span-1 sm:w-auto`}
          value={purpose}
          onChange={(e) => {
            setPurpose(e.target.value);
            setPage(0);
          }}
        >
          <option value="">Semua tujuan</option>
          {purps.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          className={`${i} col-span-2 w-full sm:col-span-1 sm:w-auto`}
          value={emp}
          onChange={(e) => {
            setEmp(e.target.value);
            setPage(0);
          }}
        >
          <option value="">Semua tujuan / staf</option>
          <option value="__general__">🏢 Resepsionis Lobi (Umum)</option>
          {emps.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button
          className={`${i} col-span-2 sm:col-span-1`}
          onClick={() => {
            setQ("");
            setDate("");
            setDateTo("");
            setPurpose("");
            setEmp("");
            setPage(0);
          }}
        >
          Reset filter
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{count} kunjungan ditemukan</p>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/admin/scan"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-primary/30 bg-brand-soft px-3.5 sm:px-4 text-xs sm:text-sm font-semibold text-primary transition-all hover:bg-primary hover:text-primary-foreground active:scale-95"
            title="Buka pemindai barcode / QR pass tamu"
          >
            <QrCode className="h-4 w-4" />
            <span>Pindai QR</span>
          </Link>
          <button
            type="button"
            disabled={Boolean(exporting) || count === 0}
            onClick={exportExcel}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 sm:px-4 text-xs sm:text-sm font-bold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
            title="Unduh data buku tamu ke spreadsheet Excel (.xlsx)"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>{exporting === "excel" ? "Menyiapkan…" : "Excel (.xlsx)"}</span>
          </button>
          <button
            type="button"
            disabled={Boolean(exporting) || count === 0}
            onClick={exportPdf}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 sm:px-4 text-xs sm:text-sm font-bold text-white shadow-sm transition-all hover:bg-rose-700 active:scale-95 disabled:opacity-50"
            title="Unduh laporan PDF bergaris rapih dengan kop Menara Nobu"
          >
            <FileText className="h-4 w-4" />
            <span>{exporting === "pdf" ? "Menyiapkan…" : "PDF"}</span>
          </button>
          <button
            type="button"
            disabled={Boolean(exporting) || count === 0}
            onClick={exportCsv}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs sm:text-sm font-medium text-foreground transition-all hover:bg-muted active:scale-95 disabled:opacity-50"
            title="Unduh format CSV alternatif"
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            <span>CSV</span>
          </button>
        </div>
      </div>
      {/* Tampilan Responsif Ponsel (< md): Kartu Pengunjung Interaktif */}
      <div className="space-y-3 md:hidden">
        {loading
          ? Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-border/80 bg-card p-4 shadow-soft space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="h-4 w-32 rounded-full skeleton-shimmer" />
                  <div className="h-4 w-16 rounded-full skeleton-shimmer opacity-70" />
                </div>
                <div className="h-5 w-48 rounded-lg skeleton-shimmer" />
                <div className="h-4 w-36 rounded-full skeleton-shimmer opacity-80" />
                <div className="pt-2 border-t border-border/60 flex gap-2">
                  <div className="h-9 flex-1 rounded-xl skeleton-shimmer" />
                  <div className="h-9 w-16 rounded-xl skeleton-shimmer opacity-60" />
                </div>
              </div>
            ))
          : rows.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-border/80 bg-card p-4 shadow-soft space-y-3 transition-colors hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-display font-bold text-foreground text-base leading-tight truncate">
                      {r.name}
                    </h3>
                    <p className="text-xs font-semibold text-primary mt-0.5 truncate">
                      {r.institution}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-brand-soft px-2.5 py-0.5 font-mono text-[11px] font-bold text-primary border border-primary/20">
                    {r.badge_code || "PASS"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-xl border border-border/50">
                  <div className="min-w-0">
                    <span className="block text-[10px] text-muted-foreground">Tujuan:</span>
                    <span className="font-semibold text-foreground truncate block">
                      {r.visit_purposes?.name ?? "-"}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] text-muted-foreground">Menemui:</span>
                    <span className="font-semibold text-foreground truncate block">
                      {r.employees?.name ?? "-"}
                    </span>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-border/40 flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">
                      {formatWibDateTime(r.check_in_time, false)}
                    </span>
                    {r.phone && <span className="font-mono text-muted-foreground">{r.phone}</span>}
                  </div>
                </div>

                {r.notes && (
                  <p className="text-xs text-muted-foreground italic bg-muted/20 px-3 py-1.5 rounded-lg border border-border/40">
                    "{r.notes}"
                  </p>
                )}

                {/* Tombol Aksi Responsif Mobile */}
                <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                  <button
                    type="button"
                    onClick={() => openBadgeModal(r)}
                    className="flex-1 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-brand-soft border border-primary/40 px-3 py-2 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-all active:scale-95 shadow-2xs"
                  >
                    <IdCard className="h-4 w-4" />
                    <span>Kartu Badge</span>
                  </button>

                  {!isSecurity && (
                    <button
                      type="button"
                      onClick={() => setEdit(r)}
                      className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors active:scale-95"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </button>
                  )}

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setToDelete(r)}
                      className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors active:scale-95"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Hapus</span>
                    </button>
                  )}
                </div>
              </div>
            ))}

        {!loading && rows.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border/80 bg-card p-6 text-center shadow-soft">
            <div className="mx-auto flex max-w-sm flex-col items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-primary shadow-sm">
                {q || date || dateTo || purpose || emp ? (
                  <SearchX className="h-6 w-6" />
                ) : (
                  <Users className="h-6 w-6" />
                )}
              </div>
              <p className="mt-3 font-display text-base font-bold text-foreground">
                {q || date || dateTo || purpose || emp
                  ? "Tamu tidak ditemukan"
                  : "Belum ada catatan tamu"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {q || date || dateTo || purpose || emp
                  ? "Tidak ada data kunjungan yang cocok dengan filter atau kata kunci."
                  : "Data kunjungan tamu akan otomatis tercatat setelah pengunjung registrasi."}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Tampilan Desktop & Tablet (>= md): Tabel Lengkap */}
      <div className="hidden md:block overflow-x-auto rounded-xl bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="cursor-pointer p-3" onClick={() => setAsc(!asc)}>
                Waktu {asc ? "↑" : "↓"}
              </th>
              <th className="p-3">Nama</th>
              <th className="p-3">Instansi</th>
              <th className="p-3">Telepon</th>
              <th className="p-3">Tujuan</th>
              <th className="p-3">Dituju</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="border-t border-border">
                    <td className="p-3">
                      <div className="h-4 w-28 rounded-full skeleton-shimmer" />
                    </td>
                    <td className="p-3">
                      <div className="h-4 w-32 rounded-full skeleton-shimmer" />
                    </td>
                    <td className="p-3">
                      <div className="h-4 w-24 rounded-full skeleton-shimmer opacity-80" />
                    </td>
                    <td className="p-3">
                      <div className="h-4 w-24 rounded-full skeleton-shimmer opacity-70" />
                    </td>
                    <td className="p-3">
                      <div className="h-5 w-20 rounded-full skeleton-shimmer opacity-85" />
                    </td>
                    <td className="p-3">
                      <div className="h-4 w-24 rounded-full skeleton-shimmer opacity-70" />
                    </td>
                    <td className="p-3">
                      <div className="h-4 w-12 rounded-full skeleton-shimmer opacity-50" />
                    </td>
                  </tr>
                ))
              : rows.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3 font-medium text-foreground">
                      {formatWibDateTime(r.check_in_time)}
                    </td>
                    <td className="p-3 font-semibold text-foreground">{r.name}</td>
                    <td className="p-3 text-muted-foreground">{r.institution}</td>
                    <td className="p-3 text-muted-foreground">{r.phone}</td>
                    <td className="p-3">
                      <span className="inline-block rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-primary">
                        {r.visit_purposes?.name ?? "-"}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">{r.employees?.name ?? "-"}</td>
                    <td className="whitespace-nowrap p-3">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-brand-soft px-2.5 py-1 text-xs font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground active:scale-95 shadow-2xs mr-2"
                        onClick={() => openBadgeModal(r)}
                      >
                        <IdCard className="h-3.5 w-3.5" />
                        <span>Badge</span>
                      </button>
                      {!isSecurity && (
                        <button
                          className="mr-3 font-medium text-primary transition-colors hover:underline"
                          onClick={() => setEdit(r)}
                        >
                          Edit
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          className="font-medium text-destructive transition-colors hover:underline"
                          onClick={() => setToDelete(r)}
                        >
                          Hapus
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="p-10 text-center">
                  <div className="mx-auto flex max-w-sm flex-col items-center justify-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-primary shadow-sm">
                      {q || date || dateTo || purpose || emp ? (
                        <SearchX className="h-7 w-7" />
                      ) : (
                        <Users className="h-7 w-7" />
                      )}
                    </div>
                    <p className="mt-4 font-display text-base font-bold text-foreground">
                      {q || date || dateTo || purpose || emp
                        ? "Tamu tidak ditemukan"
                        : "Belum ada catatan tamu"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {q || date || dateTo || purpose || emp
                        ? "Tidak ada data kunjungan yang cocok dengan filter atau kata kunci yang Anda masukkan."
                        : "Data kunjungan tamu akan otomatis tercatat setelah pengunjung mengisi formulir registrasi."}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                      {q || date || dateTo || purpose || emp ? (
                        <button
                          onClick={() => {
                            setQ("");
                            setDate("");
                            setDateTo("");
                            setPurpose("");
                            setEmp("");
                            setPage(0);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-4 py-2 text-xs font-semibold text-primary transition-all hover:bg-primary hover:text-primary-foreground active:scale-95"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Reset Filter
                        </button>
                      ) : (
                        <>
                          <Link
                            to="/registrasi"
                            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-transform hover:brightness-110 active:scale-95"
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                            Isi Registrasi Tamu
                          </Link>
                          <button
                            onClick={load}
                            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted active:scale-95"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Segarkan Data
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <button disabled={page === 0} className={i} onClick={() => setPage(page - 1)}>
          Sebelumnya
        </button>
        <span>
          Halaman {page + 1} dari {Math.max(1, Math.ceil(count / PAGE))}
        </span>
        <button
          disabled={(page + 1) * PAGE >= count}
          className={i}
          onClick={() => setPage(page + 1)}
        >
          Berikutnya
        </button>
      </div>

      {edit &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-edit-tamu-title"
            className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain animate-in fade-in duration-200"
          >
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
              onClick={() => setEdit(null)}
            />
            <div
              className="relative w-full max-w-md space-y-3.5 rounded-2xl bg-card p-5 sm:p-6 shadow-2xl border border-border/80 z-10 max-h-[92dvh] overflow-y-auto my-auto animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <h2
                id="modal-edit-tamu-title"
                className="font-display text-lg font-bold text-foreground"
              >
                Edit Data Tamu
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Nama Lengkap
                  </label>
                  <input
                    className={`${i} w-full`}
                    value={edit.name}
                    onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Instansi / Perusahaan
                  </label>
                  <input
                    className={`${i} w-full`}
                    value={edit.institution}
                    onChange={(e) => setEdit({ ...edit, institution: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Nomor Telepon / WhatsApp
                  </label>
                  <input
                    className={`${i} w-full`}
                    value={edit.phone}
                    onChange={(e) => setEdit({ ...edit, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Tujuan Kunjungan
                  </label>
                  <select
                    className={`${i} w-full`}
                    value={edit.visit_purpose_id ?? ""}
                    onChange={(e) => setEdit({ ...edit, visit_purpose_id: e.target.value })}
                  >
                    {purps.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Karyawan yang Dituju
                  </label>
                  <select
                    className={`${i} w-full`}
                    value={edit.employee_id ?? ""}
                    onChange={(e) => setEdit({ ...edit, employee_id: e.target.value || null })}
                  >
                    <option value="">🏢 Resepsionis Lobi (Umum / Tanpa Staf)</option>
                    {emps.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Catatan Kunjungan
                  </label>
                  <textarea
                    rows={2}
                    className={`${i} w-full resize-none`}
                    value={edit.notes ?? ""}
                    onChange={(e) => setEdit({ ...edit, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                <button
                  type="button"
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors active:scale-95"
                  onClick={() => setEdit(null)}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:brightness-110 active:scale-95 transition-all"
                  onClick={save}
                >
                  Simpan Perubahan
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Hapus data tamu?"
        description={`Data kunjungan "${toDelete?.name ?? ""}" akan dihapus permanen.`}
        onConfirm={del}
      />
      {badgeGuest && (
        <VisitorBadgeModal
          open={!!badgeGuest}
          onClose={() => setBadgeGuest(null)}
          data={badgeGuest}
        />
      )}
    </div>
  );
}
