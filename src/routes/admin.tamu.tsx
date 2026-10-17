import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw, RotateCcw, SearchX, UserPlus, Users, IdCard, QrCode } from "lucide-react";
import { supabase, type Employee, type Guest, type Purpose } from "@/lib/supabase";
import { VisitorBadgeModal, type VisitorBadgeData } from "@/components/VisitorBadgeModal";

export const Route = createFileRoute("/admin/tamu")({ component: Guests });
const PAGE = 20;

function Guests() {
  const [rows, setRows] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const [date, setDate] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [purpose, setPurpose] = useState("");
  const [emp, setEmp] = useState("");
  const [asc, setAsc] = useState(false);
  const [emps, setEmps] = useState<Employee[]>([]);
  const [purps, setPurps] = useState<Purpose[]>([]);
  const [edit, setEdit] = useState<Guest | null>(null);
  const [badgeGuest, setBadgeGuest] = useState<VisitorBadgeData | null>(null);

  useEffect(() => {
    supabase
      .from("employees")
      .select("*")
      .order("name")
      .then(({ data }) => setEmps(data ?? []));
    supabase
      .from("visit_purposes")
      .select("*")
      .order("name")
      .then(({ data }) => setPurps(data ?? []));
  }, []);

  const buildQuery = useCallback(() => {
    let qb = supabase
      .from("guests")
      .select("*, employees(name), visit_purposes(name)", { count: "exact" });
    const term = q.replace(/[,()%*]/g, " ").trim();
    if (term) qb = qb.or(`name.ilike.%${term}%,institution.ilike.%${term}%,phone.ilike.%${term}%`);
    if (date) qb = qb.gte("check_in_time", new Date(`${date}T00:00:00`).toISOString());
    if (dateTo || date) {
      const e = new Date(`${dateTo || date}T00:00:00`);
      e.setDate(e.getDate() + 1);
      qb = qb.lt("check_in_time", e.toISOString());
    }
    if (purpose) qb = qb.eq("visit_purpose_id", purpose);
    if (emp) qb = qb.eq("employee_id", emp);
    return qb.order("check_in_time", { ascending: asc });
  }, [q, date, dateTo, purpose, emp, asc]);

  const [exporting, setExporting] = useState(false);
  const exportCsv = async () => {
    setExporting(true);
    const all: Guest[] = [];
    for (let from = 0; ; from += 1000) {
      const { data } = await buildQuery().range(from, from + 999);
      all.push(...((data as Guest[]) ?? []));
      if (!data || data.length < 1000) break;
    }
    const esc = (v: unknown) => {
      let t = String(v ?? "");
      if (/^[=+\-@]/.test(t)) t = "'" + t;
      return `"${t.replace(/"/g, '""')}"`;
    };
    const lines = [
      [
        "Waktu",
        "Nama",
        "Instansi",
        "Telepon",
        "Tujuan",
        "Dituju",
        "Catatan",
        "Durasi isi (detik)",
      ].join(","),
    ];
    all.forEach((r) =>
      lines.push(
        [
          new Date(r.check_in_time).toLocaleString("id-ID"),
          r.name,
          r.institution,
          r.phone,
          r.visit_purposes?.name,
          r.employees?.name,
          r.notes,
          r.fill_duration_seconds,
        ]
          .map(esc)
          .join(","),
      ),
    );
    const url = URL.createObjectURL(
      new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `data-tamu-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    setExporting(false);
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
        employee_id: edit.employee_id,
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
      <h1 className="text-2xl font-bold text-foreground">Data Tamu</h1>
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
          <option value="">Semua karyawan</option>
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
        <div className="flex items-center gap-2">
          <Link
            to="/scan"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-primary/30 bg-brand-soft px-4 text-xs sm:text-sm font-semibold text-primary transition-all hover:bg-primary hover:text-primary-foreground active:scale-95"
            title="Buka pemindai barcode / QR pass tamu"
          >
            <QrCode className="h-4 w-4" />
            <span>Pindai QR / Badge</span>
          </Link>
          <button
            disabled={exporting || count === 0}
            onClick={exportCsv}
            className="min-h-10 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-all active:scale-95 disabled:opacity-50"
          >
            {exporting ? "Menyiapkan…" : "Ekspor CSV"}
          </button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl bg-card">
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
                      {new Date(r.check_in_time).toLocaleString("id-ID")}
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
                        className="mr-3 font-semibold text-emerald-600 dark:text-emerald-400 transition-colors hover:underline"
                        onClick={() =>
                          setBadgeGuest({
                            id: r.id,
                            name: r.name,
                            institution: r.institution,
                            phone: r.phone,
                            employeeName: r.employees?.name ?? undefined,
                            purposeName: r.visit_purposes?.name ?? undefined,
                            checkInTime: new Date(r.check_in_time).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            }),
                            checkInDate: new Date(r.check_in_time).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }),
                            badgeNumber: r.badge_code || undefined,
                          })
                        }
                      >
                        Badge
                      </button>
                      <button
                        className="mr-3 font-medium text-primary transition-colors hover:underline"
                        onClick={() => setEdit(r)}
                      >
                        Edit
                      </button>
                      <button
                        className="font-medium text-destructive transition-colors hover:underline"
                        onClick={() => setToDelete(r)}
                      >
                        Hapus
                      </button>
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

      {edit && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-edit-tamu-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain"
        >
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setEdit(null)}
          />
          <div
            className="relative w-full max-w-md space-y-3.5 rounded-2xl bg-card p-5 sm:p-6 shadow-2xl border border-border/80 z-10 max-h-[92dvh] overflow-y-auto my-auto"
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
                  onChange={(e) => setEdit({ ...edit, employee_id: e.target.value })}
                >
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
        </div>
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
