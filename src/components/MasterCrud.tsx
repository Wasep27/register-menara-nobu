import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  FolderKanban,
  Plus,
  Search,
  ShieldCheck,
  UserCheck,
  Lock,
  KeyRound,
  Loader2,
  Mail,
  Edit3,
  Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { employeeSchema, purposeSchema, fieldErrors } from "@/lib/validation";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useAdminRole } from "@/hooks/useAdminRole";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PasswordInput } from "@/components/ui/password-input";

type Row = {
  id: string;
  name: string;
  department?: string | null;
  email?: string | null;
  user_id?: string | null;
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

  // State untuk pembuatan akun portal login bersamaan dengan data karyawan
  const [createLoginAccount, setCreateLoginAccount] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");

  // State untuk quick modal Buat Akun / Reset Password Karyawan
  const [accountTarget, setAccountTarget] = useState<Row | null>(null);
  const [accountPassword, setAccountPassword] = useState("");
  const [accountLoading, setAccountLoading] = useState(false);

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
    setCreateLoginAccount(false);
    setLoginPassword("");
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

    if (withDept && createLoginAccount) {
      if (!email.trim()) {
        setErrs((x) => ({ ...x, email: "Email wajib diisi untuk membuat akun login" }));
        toast.error("Email wajib diisi jika membuat akun login portal");
        return;
      }
      if (loginPassword.length < 6) {
        toast.error("Password akun portal minimal 6 karakter");
        return;
      }
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

    // Buat akun login jika opsi dicentang
    if (withDept && createLoginAccount && email.trim() && loginPassword) {
      const { error: userErr } = await supabase.rpc("admin_create_user", {
        _email: email.trim().toLowerCase(),
        _password: loginPassword,
        _full_name: name.trim(),
        _role: "staff",
      });
      if (userErr) {
        toast.warning(
          `Data karyawan tersimpan, tetapi gagal membuat akun login: ${userErr.message}`,
        );
      } else {
        toast.success(
          `Akun Portal Karyawan (${email}) berhasil dibuat! Karyawan dapat masuk di /karyawan.`,
        );
      }
    } else {
      toast.success(editId ? `Data ${label} diperbarui` : `Data ${label} ditambahkan`);
    }

    setFormOpen(false);
    load();
  };

  const handleQuickAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountTarget || !accountTarget.email) return;
    if (accountPassword.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }

    setAccountLoading(true);
    try {
      if (accountTarget.user_id) {
        // Reset password
        const { error } = await supabase.rpc("admin_reset_user_password", {
          _target_user_id: accountTarget.user_id,
          _new_password: accountPassword,
        });
        if (error) {
          toast.error(`Gagal mereset password: ${error.message}`);
        } else {
          toast.success(`Password portal untuk ${accountTarget.name} berhasil diubah!`);
          setAccountTarget(null);
          setAccountPassword("");
        }
      } else {
        // Buat user baru di auth.users (otomatis terhubung via trigger)
        const { error } = await supabase.rpc("admin_create_user", {
          _email: accountTarget.email.trim().toLowerCase(),
          _password: accountPassword,
          _full_name: accountTarget.name,
          _role: "staff",
        });
        if (error) {
          toast.error(`Gagal membuat akun: ${error.message}`);
        } else {
          toast.success(
            `Akun portal untuk ${accountTarget.name} aktif! Karyawan dapat masuk di /karyawan.`,
          );
          setAccountTarget(null);
          setAccountPassword("");
          load();
        }
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setAccountLoading(false);
    }
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
            className="w-full sm:w-auto inline-flex min-h-11 sm:min-h-10 items-center justify-center gap-1.5 rounded-xl sm:rounded-full bg-primary px-4 py-2.5 sm:py-2 text-xs sm:text-sm font-bold sm:font-semibold text-primary-foreground shadow-sm transition-all hover:brightness-110 active:scale-95 shrink-0"
            onClick={() => openForm()}
          >
            <Plus className="h-4 w-4 shrink-0" />
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
            <div key={r.id} className="border-b border-border/60 last:border-0">
              {/* TAMPILAN RESPONSIVE MOBILE (< md): Kartu Elegan, Bebas Tumpukan */}
              <div className="md:hidden p-3.5 sm:p-4 space-y-3 hover:bg-muted/15 transition-colors">
                {/* Baris 1: Nama, Departemen & Status Keaktifan */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-foreground text-sm leading-snug">
                        {r.name}
                      </span>
                      {r.department && (
                        <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground shrink-0">
                          {r.department}
                        </span>
                      )}
                    </div>
                    {r.email ? (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 truncate">
                        <Mail className="h-3 w-3 shrink-0 opacity-70" />
                        <span className="truncate">{r.email}</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-muted-foreground/70 italic mt-0.5 block">
                        Belum ada email resmi
                      </span>
                    )}
                  </div>

                  {/* Toggle Aktif / Nonaktif */}
                  <div className="shrink-0">
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
                  </div>
                </div>

                {/* Baris 2: Indikator Akses Portal Karyawan Terpadu (Tidak Bertumpuk) */}
                {withDept && (
                  <div className="pt-0.5">
                    {r.user_id ? (
                      /* Karyawan sudah punya akun portal aktif */
                      <div className="flex items-center justify-between gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 px-3 py-2 text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white shrink-0">
                            <UserCheck className="h-3 w-3" />
                          </span>
                          <span className="font-semibold text-emerald-800 dark:text-emerald-300 truncate">
                            Akun Portal Aktif
                          </span>
                        </div>
                        {canAdd && (
                          <button
                            type="button"
                            onClick={() => {
                              setAccountTarget(r);
                              setAccountPassword("");
                            }}
                            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-emerald-600/30 bg-card px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted active:scale-95 transition-all shadow-2xs"
                          >
                            <KeyRound className="h-3 w-3 text-muted-foreground" />
                            <span>Reset Sandi</span>
                          </button>
                        )}
                      </div>
                    ) : r.email ? (
                      /* Karyawan memiliki email tapi belum dibuatkan akun portal */
                      <div className="flex items-center justify-between gap-2 rounded-xl bg-amber-500/10 border border-amber-500/25 px-3 py-2 text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                          <span className="font-medium text-amber-900 dark:text-amber-200 truncate">
                            Belum punya akun portal
                          </span>
                        </div>
                        {canAdd && (
                          <button
                            type="button"
                            onClick={() => {
                              setAccountTarget(r);
                              setAccountPassword("");
                            }}
                            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary hover:brightness-110 text-primary-foreground px-2.5 py-1 text-xs font-bold shadow-xs active:scale-95 transition-all"
                          >
                            <KeyRound className="h-3 w-3" />
                            <span>+ Buat Akun</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      /* Belum ada email resmi */
                      <div className="flex items-center justify-between gap-2 rounded-xl bg-muted/40 border border-border/50 px-3 py-2 text-[11px] text-muted-foreground">
                        <span className="truncate">Isi email untuk akses portal</span>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => openForm(r)}
                            className="font-semibold text-primary hover:underline shrink-0 text-xs"
                          >
                            + Tambah Email
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Baris 3: Tombol Aksi Bersih & Ramah Sentuhan */}
                {(canEdit || canDelete) && (
                  <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                    {canEdit && (
                      <button
                        type="button"
                        className="flex-1 inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors active:scale-95"
                        onClick={() => openForm(r)}
                      >
                        <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Edit Data</span>
                      </button>
                    )}

                    {canDelete && (
                      <button
                        type="button"
                        className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors active:scale-95"
                        onClick={() => setToDelete(r)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Hapus</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* TAMPILAN DESKTOP & TABLET (>= md): Baris Horizontal Rapi & Proporsional */}
              <div className="hidden md:flex items-center justify-between gap-3 p-3.5 text-sm hover:bg-muted/30 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">{r.name}</span>
                    {r.department && (
                      <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground font-medium shrink-0">
                        {r.department}
                      </span>
                    )}
                    {withDept &&
                      (r.user_id ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
                          <UserCheck className="h-3 w-3" />
                          Portal Aktif
                        </span>
                      ) : r.email ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400 shrink-0">
                          Belum Punya Akun
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground shrink-0">
                          Email Kosong
                        </span>
                      ))}
                  </div>
                  {r.email && (
                    <span className="block text-xs text-muted-foreground/80 mt-0.5 truncate">
                      {r.email}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Tombol Cepat Buat / Reset Akun Portal Karyawan */}
                  {withDept && canAdd && r.email && (
                    <button
                      type="button"
                      onClick={() => {
                        setAccountTarget(r);
                        setAccountPassword("");
                      }}
                      title={
                        r.user_id
                          ? "Reset kata sandi portal karyawan"
                          : "Buatkan akun login portal karyawan"
                      }
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all active:scale-95 ${
                        r.user_id
                          ? "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                          : "border border-primary/20 bg-brand-soft text-primary hover:bg-primary hover:text-primary-foreground shadow-2xs"
                      }`}
                    >
                      <KeyRound className="h-3 w-3" />
                      <span>{r.user_id ? "Reset Sandi" : "+ Akun Portal"}</span>
                    </button>
                  )}

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
            </div>
          ))
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={(o) => !saving && setFormOpen(o)}>
        <DialogContent className="rounded-2xl max-w-md">
          <form onSubmit={save} noValidate className="space-y-3">
            <DialogHeader>
              <DialogTitle>{editId ? `Edit ${label}` : `Tambah ${label}`}</DialogTitle>
              <DialogDescription>
                {withDept
                  ? "Kelola data karyawan dan akses login Portal Karyawan."
                  : "Isi data lalu tekan Simpan."}
              </DialogDescription>
            </DialogHeader>
            <Field label="Nama Lengkap" required err={errs.name}>
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
              <Field label="Departemen / Divisi (opsional)" err={errs.department}>
                <input
                  className={ic("department")}
                  aria-invalid={!!errs.department}
                  maxLength={100}
                  placeholder="Contoh: Keuangan / HRD / IT"
                  value={dept}
                  onChange={(e) => setDept(e.target.value)}
                />
              </Field>
            )}
            {withDept && (
              <Field label="Email Resmi Karyawan (untuk notifikasi & login)" err={errs.email}>
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

            {/* Opsi Buat Akun Portal Karyawan Sekaligus */}
            {withDept && !editId && (
              <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2 mt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground">
                  <input
                    type="checkbox"
                    checked={createLoginAccount}
                    onChange={(e) => setCreateLoginAccount(e.target.checked)}
                    className="rounded border-input text-primary focus:ring-primary"
                  />
                  <span>Buatkan Akun Login Portal Karyawan Sekaligus</span>
                </label>
                {createLoginAccount && (
                  <div className="pt-1 space-y-1.5">
                    <label className="text-[11px] text-muted-foreground block font-medium">
                      Kata Sandi Awal Login (min. 6 karakter){" "}
                      <span className="text-destructive">*</span>
                    </label>
                    <PasswordInput
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Masukkan kata sandi..."
                      className="w-full rounded-lg border border-input bg-card px-3 py-1.5 text-xs focus:ring-2 focus:ring-primary/20"
                    />
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Karyawan dapat langsung masuk ke <strong>/karyawan</strong> untuk memantau
                      tamu dan menerima notifikasi kedatangan tamu.
                    </p>
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              <button
                type="button"
                className="w-full sm:w-auto min-h-11 sm:min-h-10 rounded-xl sm:rounded-lg border border-input px-4 text-xs font-semibold sm:font-medium text-foreground hover:bg-muted transition-colors active:scale-95"
                onClick={() => setFormOpen(false)}
                disabled={saving}
              >
                Batal
              </button>
              <button
                className="w-full sm:w-auto min-h-11 sm:min-h-10 rounded-xl sm:rounded-lg bg-primary px-4 text-xs font-bold sm:font-semibold text-primary-foreground hover:brightness-110 active:scale-95 transition-all shadow-sm"
                disabled={saving}
              >
                {saving ? "Menyimpan…" : "Simpan Data"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Cepat Buat / Reset Akun Portal Karyawan */}
      <Dialog
        open={!!accountTarget}
        onOpenChange={(o) => !accountLoading && !o && setAccountTarget(null)}
      >
        <DialogContent className="rounded-2xl max-w-sm">
          <form onSubmit={handleQuickAccount} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-soft text-primary">
                  <KeyRound className="h-4 w-4" />
                </span>
                {accountTarget?.user_id ? "Reset Password Portal" : "Buatkan Akun Portal"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {accountTarget?.user_id
                  ? `Ubah kata sandi login untuk ${accountTarget?.name} (${accountTarget?.email}).`
                  : `Aktifkan akses login portal untuk ${accountTarget?.name} (${accountTarget?.email}).`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground block">
                {accountTarget?.user_id ? "Kata Sandi Baru" : "Kata Sandi Akun"}{" "}
                <span className="text-destructive">*</span>
              </label>
              <PasswordInput
                required
                value={accountPassword}
                onChange={(e) => setAccountPassword(e.target.value)}
                placeholder="Minimal 6 karakter..."
                className="w-full rounded-xl border border-input bg-card px-3.5 py-2 text-xs focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-[11px] text-muted-foreground">
                Karyawan masuk melalui menu <strong>/karyawan</strong> menggunakan email{" "}
                <strong>{accountTarget?.email}</strong>.
              </p>
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                disabled={accountLoading}
                onClick={() => setAccountTarget(null)}
                className="w-full sm:w-auto min-h-11 sm:min-h-10 rounded-xl sm:rounded-lg border border-input px-4 text-xs font-semibold sm:font-medium text-foreground hover:bg-muted transition-colors active:scale-95"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={accountLoading}
                className="w-full sm:w-auto min-h-11 sm:min-h-10 rounded-xl sm:rounded-lg bg-primary px-4 text-xs font-bold sm:font-semibold text-primary-foreground hover:brightness-110 active:scale-95 inline-flex items-center justify-center gap-1.5 transition-all shadow-sm"
              >
                {accountLoading && <Loader2 className="h-3 w-3 animate-spin shrink-0" />}
                <span>
                  {accountLoading
                    ? "Memproses…"
                    : accountTarget?.user_id
                      ? "Simpan Password Baru"
                      : "Aktifkan Akun Portal"}
                </span>
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
