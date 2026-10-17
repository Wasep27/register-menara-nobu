import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FolderKanban, Plus, Search, ShieldCheck, UserCheck, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { employeeSchema, purposeSchema, fieldErrors } from "@/lib/validation";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useAdminRole } from "@/routes/admin";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Row = {
  id: string;
  name: string;
  department?: string | null;
  email?: string | null;
  is_active: boolean;
};

export function MasterCrud({
  table,
  title,
  withDept,
}: {
  table: "employees" | "visit_purposes";
  title: string;
  withDept?: boolean;
}) {
  const { isAdmin, isSecurity, isStaff } = useAdminRole();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [name, setName] = useState("");
  const [dept, setDept] = useState("");
  const [email, setEmail] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errs, setErrs] = useState<Partial<Record<"name" | "department" | "email", string>>>({});
  const [toDelete, setToDelete] = useState<Row | null>(null);
  const label = table === "employees" ? "karyawan" : "tujuan kunjungan";

  // Perizinan CRUD otomatis berbasis role:
  // - Admin: Akses penuh (Tambah, Edit, Toggle Aktif, Hapus)
  // - Staff: Akses operasional front desk (Tambah, Edit, Toggle Aktif, TANPA HAPUS)
  // - Security: Read-Only direktori kontak (Hanya cari & lihat, tanpa CRUD)
  const canAdd = isAdmin || isStaff;
  const canEdit = isAdmin || isStaff;
  const canToggle = isAdmin || isStaff;
  const canDelete = isAdmin;
  const isReadOnly = isSecurity;

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from(table).select("*").order("name");
    if (error) toast.error("Gagal memuat data");
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }, [table]);
  useEffect(() => {
    load();
  }, [load]);

  const openForm = (r?: Row) => {
    setEditId(r?.id ?? null);
    setName(r?.name ?? "");
    setDept(r?.department ?? "");
    setEmail(r?.email ?? "");
    setErrs({});
    setFormOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = withDept
      ? employeeSchema.safeParse({ name, department: dept, email })
      : purposeSchema.safeParse({ name });
    if (!r.success) {
      setErrs(fieldErrors(r.error.issues) as typeof errs);
      toast.error("Periksa kembali isian yang ditandai merah");
      return;
    }
    setErrs({});
    const dup = rows.find(
      (x) => x.id !== editId && x.name.trim().toLowerCase() === name.trim().toLowerCase(),
    );
    if (dup) {
      setErrs({ name: `"${dup.name}" sudah ada di daftar` });
      return;
    }
    const payload: Record<string, unknown> = { name: name.trim() };
    if (withDept) {
      payload["department"] = dept.trim() || null;
      payload["email"] = email.trim().toLowerCase() || null;
    }
    setSaving(true);
    const { error } = editId
      ? await supabase.from(table).update(payload).eq("id", editId)
      : await supabase.from(table).insert(payload);
    setSaving(false);
    if (error) {
      toast.error(
        error.code === "23505"
          ? withDept
            ? "Email ini sudah dipakai karyawan lain"
            : "Data sudah ada"
          : error.code === "23514"
            ? "Isian tidak sesuai aturan, periksa kembali"
            : "Gagal menyimpan. Periksa koneksi lalu coba lagi.",
      );
      return;
    }
    toast.success(editId ? `Data ${label} diperbarui` : `Data ${label} ditambahkan`);
    setFormOpen(false);
    load();
  };

  const toggle = async (r: Row) => {
    const { error } = await supabase.from(table).update({ is_active: !r.is_active }).eq("id", r.id);
    if (error) {
      toast.error("Gagal mengubah status");
      return;
    }
    toast.success(`${r.name} ${r.is_active ? "dinonaktifkan" : "diaktifkan"}`);
    load();
  };

  const remove = async () => {
    if (!toDelete) return;
    const { error } = await supabase.from(table).delete().eq("id", toDelete.id);
    if (error) {
      toast.error("Gagal menghapus. Data mungkin masih dipakai oleh tamu — nonaktifkan saja.");
      return;
    }
    toast.success(`${toDelete.name} dihapus`);
    load();
  };

  const filteredRows = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(term) ||
        (r.department && r.department.toLowerCase().includes(term)) ||
        (r.email && r.email.toLowerCase().includes(term)),
    );
  }, [rows, q]);

  const i = "min-h-11 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm";
  const ic = (k: keyof typeof errs) => (errs[k] ? i + " border-destructive bg-destructive/5" : i);

  return (
    <div className="space-y-4">
      {/* Header with Title & Role Access Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              {isReadOnly && table === "employees" ? "Direktori Karyawan & Host" : title}
            </h1>
            {isAdmin && (
              <span className="hidden xs:inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-0.5 text-[11px] font-bold text-primary">
                <ShieldCheck className="h-3 w-3" /> Admin
              </span>
            )}
            {isStaff && (
              <span className="hidden xs:inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                <UserCheck className="h-3 w-3" /> Front Desk
              </span>
            )}
            {isReadOnly && (
              <span className="hidden xs:inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                <Lock className="h-3 w-3" /> Pos Jaga (Read-Only)
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isReadOnly
              ? "Cari data staf dan unit kerja untuk verifikasi dan konfirmasi pengunjung di pos jaga."
              : isStaff
                ? "Kelola data staf penerima tamu. Penghapusan data permanen dibatasi untuk Super Admin."
                : `Kelola data master ${label} dengan hak akses administrator penuh.`}
          </p>
        </div>

        {/* Action button - only visible if user has add permission (Admin & Staff) */}
        {canAdd && (
          <button
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs sm:text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:brightness-110 active:scale-95 shrink-0"
            onClick={() => openForm()}
          >
            <Plus className="h-4 w-4" />
            <span>Tambah {label}</span>
          </button>
        )}
      </div>

      {/* Role specific info notice for staff or security */}
      {isStaff && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3.5 py-2 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2">
          <span>
            ℹ️ <strong>Akses Staf Lobi:</strong> Anda dapat menambahkan dan memperbarui kontak
            karyawan. Tombol hapus disembunyikan demi menjaga integritas riwayat tamu.
          </span>
        </div>
      )}

      {isReadOnly && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between gap-2">
          <span>
            🛡️ <strong>Mode Direktori Pos Keamanan:</strong> Formulir pendaftaran dan tombol
            modifikasi disembunyikan. Gunakan kolom pencarian di bawah untuk mencari kontak karyawan
            yang dituju tamu.
          </span>
        </div>
      )}

      {/* Search Input for quick filtering */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Cari nama ${label}${withDept ? ", divisi, atau email" : ""}...`}
          className="w-full rounded-2xl border border-border bg-card pl-10 pr-4 py-2.5 text-xs sm:text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
          >
            Bersihkan
          </button>
        )}
      </div>

      {/* Table / List Container */}
      <div className="rounded-2xl border border-border/80 bg-card shadow-soft overflow-hidden">
        {loading ? (
          <div className="space-y-1 p-2">
            {[1, 2, 3, 4, 5].map((k) => (
              <div
                key={k}
                className="flex items-center gap-3 border-b border-border/60 p-3 last:border-0"
              >
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="h-4 w-36 rounded-full skeleton-shimmer" />
                  {withDept && (
                    <div className="h-3 w-24 rounded-full skeleton-shimmer opacity-70" />
                  )}
                </div>
                <div className="h-6 w-16 rounded-full skeleton-shimmer opacity-85" />
                <div className="h-4 w-10 rounded-full skeleton-shimmer opacity-60" />
                <div className="h-4 w-12 rounded-full skeleton-shimmer opacity-60" />
              </div>
            ))}
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-primary shadow-sm">
              <FolderKanban className="h-6 w-6" />
            </div>
            <p className="mt-3 font-semibold text-foreground">
              {q ? `Tidak ada hasil pencarian "${q}"` : `Belum ada ${label}`}
            </p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              {q
                ? "Coba gunakan kata kunci lain atau bersihkan filter pencarian."
                : `Tambahkan ${label} pertama agar dapat dipilih dalam formulir registrasi tamu.`}
            </p>
            {canAdd && !q && (
              <button
                onClick={() => openForm()}
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-all hover:brightness-110 active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />
                Tambah {label} Sekarang
              </button>
            )}
          </div>
        ) : (
          filteredRows.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 p-3 sm:p-3.5 text-sm last:border-0 hover:bg-muted/30 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{r.name}</span>
                  {r.department && (
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground font-medium">
                      {r.department}
                    </span>
                  )}
                </div>
                {r.email && (
                  <span className="block text-xs text-muted-foreground/80 mt-0.5 truncate">
                    {r.email}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Active status button (or badge if read-only) */}
                {canToggle ? (
                  <button
                    type="button"
                    title={r.is_active ? "Klik untuk menonaktifkan" : "Klik untuk mengaktifkan"}
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-all active:scale-95 ${
                      r.is_active
                        ? "bg-primary text-primary-foreground shadow-2xs hover:brightness-110"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                    onClick={() => toggle(r)}
                  >
                    {r.is_active ? "Aktif" : "Nonaktif"}
                  </button>
                ) : (
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      r.is_active
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {r.is_active ? "Aktif" : "Nonaktif"}
                  </span>
                )}

                {/* Edit button - Admin and Staff */}
                {canEdit && (
                  <button
                    type="button"
                    className="rounded-lg px-2.5 py-1 text-xs font-semibold text-primary hover:bg-brand-soft transition-colors active:scale-95"
                    onClick={() => openForm(r)}
                  >
                    Edit
                  </button>
                )}

                {/* Delete button - Admin ONLY */}
                {canDelete && (
                  <button
                    type="button"
                    className="rounded-lg px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors active:scale-95"
                    onClick={() => setToDelete(r)}
                  >
                    Hapus
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={(o) => !saving && setFormOpen(o)}>
        <DialogContent className="rounded-2xl">
          <form onSubmit={save} noValidate className="space-y-3">
            <DialogHeader>
              <DialogTitle>{editId ? `Edit ${label}` : `Tambah ${label}`}</DialogTitle>
              <DialogDescription>Isi data lalu tekan Simpan.</DialogDescription>
            </DialogHeader>
            <Field label="Nama" required err={errs.name}>
              <input
                autoFocus
                className={ic("name")}
                aria-invalid={!!errs.name}
                maxLength={100}
                placeholder={withDept ? "Contoh: Budi Santoso" : "Contoh: Rapat bisnis"}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setErrs((x) => ({ ...x, name: "" }));
                }}
              />
            </Field>
            {withDept && (
              <Field label="Departemen (opsional)" err={errs.department}>
                <input
                  className={ic("department")}
                  aria-invalid={!!errs.department}
                  maxLength={100}
                  placeholder="Contoh: Keuangan"
                  value={dept}
                  onChange={(e) => setDept(e.target.value)}
                />
              </Field>
            )}
            {withDept && (
              <Field label="Email login (opsional, untuk notifikasi)" err={errs.email}>
                <input
                  className={ic("email")}
                  aria-invalid={!!errs.email}
                  type="email"
                  maxLength={255}
                  placeholder="nama@nobu.id"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrs((x) => ({ ...x, email: "" }));
                  }}
                />
              </Field>
            )}
            <DialogFooter className="gap-2">
              <button
                type="button"
                className="min-h-11 rounded-lg border border-input px-4 text-sm"
                onClick={() => setFormOpen(false)}
                disabled={saving}
              >
                Batal
              </button>
              <button
                className="min-h-11 rounded-lg bg-primary px-4 text-sm text-primary-foreground"
                disabled={saving}
              >
                {saving ? "Menyimpan…" : "Simpan"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Hapus ${label}?`}
        description={`"${toDelete?.name ?? ""}" akan dihapus permanen dan tidak bisa dikembalikan.`}
        onConfirm={remove}
      />
    </div>
  );
}

function Field({
  label,
  required,
  err,
  children,
}: {
  label: string;
  required?: boolean;
  err?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-foreground">
        {label}
        {required && (
          <span className="text-destructive" aria-hidden>
            {" "}
            *
          </span>
        )}
      </span>
      <div className="mt-1">{children}</div>
      {err && (
        <span role="alert" className="mt-1 flex items-center gap-1 text-xs text-destructive">
          <span aria-hidden>⚠</span>
          {err}
        </span>
      )}
    </label>
  );
}
