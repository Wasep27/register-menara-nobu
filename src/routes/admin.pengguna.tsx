import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase, type AppRole } from "@/lib/supabase";
import { formatWibDate } from "@/lib/date-utils";
import { toast } from "sonner";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Loader2,
  UserPlus,
  KeyRound,
  Trash2,
  X,
  Lock,
  RefreshCw,
  Search,
  Pencil,
  User,
  Sparkles,
  Copy,
  Check,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PasswordInput } from "@/components/ui/password-input";
import { adminUpdateUserName } from "@/lib/profile-utils";
import {
  evaluatePassword,
  generateStrongPassword,
  type PasswordStrength,
} from "@/lib/password-utils";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/pengguna")({
  head: () => ({
    meta: [
      { title: "Pengguna & Role — Admin Menara Nobu" },
      {
        name: "description",
        content: "Kelola akun dan penugasan peran admin, security, dan staff.",
      },
      { property: "og:title", content: "Pengguna & Role — Admin Menara Nobu" },
      {
        property: "og:description",
        content: "Kelola akun dan penugasan peran admin, security, dan staff.",
      },
    ],
  }),
  component: UsersPage,
});

type Row = {
  id: string;
  email: string;
  full_name: string | null;
  roles: string[];
  is_employee: boolean;
  created_at: string;
};

const AVAILABLE_ROLES: { role: AppRole; label: string; desc: string; badgeClass: string }[] = [
  {
    role: "admin",
    label: "Admin",
    desc: "Akses penuh sistem, master data & ekspor",
    badgeClass: "bg-primary text-primary-foreground",
  },
  {
    role: "security",
    label: "Security",
    desc: "Pos verifikasi scan pass & kedatangan",
    badgeClass: "bg-emerald-600 text-white dark:bg-emerald-500",
  },
  {
    role: "staff",
    label: "Staff Lobi",
    desc: "Buku tamu lobi & pendaftaran walk-in",
    badgeClass: "bg-amber-600 text-white dark:bg-amber-500",
  },
];

function UsersPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [loadingRole, setLoadingRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // State Dialog Tambah Akun
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState<AppRole>("staff");
  const [createLoading, setCreateLoading] = useState(false);
  const [createCopied, setCreateCopied] = useState(false);

  // State Dialog Edit Nama Pengguna
  const [editTarget, setEditTarget] = useState<Row | null>(null);
  const [editName, setEditName] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // State Dialog Reset Password (Sesuai Best Practice)
  const [resetTarget, setResetTarget] = useState<Row | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetCopied, setResetCopied] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // State Dialog Hapus Akun
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [repairLoading, setRepairLoading] = useState(false);

  const fetchUsers = () => {
    supabase.rpc("list_users_with_roles").then(({ data, error }) => {
      if (error)
        setErr("Gagal memuat pengguna. Pastikan schema.sql terbaru sudah dijalankan di Supabase.");
      else setRows((data ?? []) as Row[]);
    });
  };

  const handleRepairIdentities = async () => {
    setRepairLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_repair_identities");
      if (error) {
        toast.error(
          `Gagal memperbaiki identitas: ${error.message}. Pastikan schema.sql terbaru sudah dijalankan.`,
        );
      } else {
        const rowsRes = Array.isArray(data) ? data : [data];
        const count = rowsRes[0]?.repaired_count ?? 0;
        if (count > 0) {
          toast.success(
            `Berhasil memperbaiki ${count} akun! Provider 'email' sekarang aktif dan akun dapat langsung login.`,
          );
        } else {
          toast.info("Semua akun sudah memiliki provider 'email' aktif di Supabase.");
        }
        fetchUsers();
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRepairLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  const handleToggleRole = async (userId: string, role: AppRole, currentlyAssigned: boolean) => {
    const actionKey = `${userId}-${role}`;
    setLoadingRole(actionKey);
    try {
      const { error } = await supabase.rpc("set_user_role", {
        _target_user_id: userId,
        _role: role,
        _assign: !currentlyAssigned,
      });

      if (error) {
        toast.error(`Gagal mengubah role: ${error.message}`);
      } else {
        toast.success(
          `Role ${role.toUpperCase()} berhasil ${currentlyAssigned ? "dicabut" : "diberikan"}`,
        );
        fetchUsers();
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoadingRole(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createEmail.trim()) {
      toast.error("Email wajib diisi");
      return;
    }
    if (createPassword.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }

    setCreateLoading(true);
    try {
      const { error } = await supabase.rpc("admin_create_user", {
        _email: createEmail.trim().toLowerCase(),
        _password: createPassword,
        _full_name: createName.trim() || null,
        _role: createRole,
      });

      if (error) {
        toast.error(`Gagal membuat akun: ${error.message}`);
      } else {
        // Otomatis sinkronkan identitas jika ada Supabase schema baru
        try {
          await supabase.rpc("admin_repair_identities");
        } catch {
          // ignore if rpc not yet created
        }
        toast.success(
          `Akun baru (${createEmail}) berhasil dibuat dengan peran ${createRole.toUpperCase()} dan provider email aktif!`,
        );
        setCreateOpen(false);
        setCreateName("");
        setCreateEmail("");
        setCreatePassword("");
        setCreateRole("staff");
        fetchUsers();
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCreateLoading(false);
    }
  };

  const resetStrength = useMemo(() => evaluatePassword(newPassword), [newPassword]);
  const createStrength = useMemo(() => evaluatePassword(createPassword), [createPassword]);

  const handleGenerateResetPassword = () => {
    const generated = generateStrongPassword(14);
    setNewPassword(generated);
    setResetConfirmPassword(generated);
    setResetCopied(false);
    toast.success("Password rekomendasi berhasil dibuat dan disinkronkan ke kedua kolom!");
  };

  const handleCopyResetPassword = async () => {
    if (!newPassword) return;
    try {
      await navigator.clipboard.writeText(newPassword);
      setResetCopied(true);
      toast.success("Password berhasil disalin ke clipboard!");
      setTimeout(() => setResetCopied(false), 3000);
    } catch {
      toast.info(`Password: ${newPassword}`);
    }
  };

  const handleGenerateCreatePassword = () => {
    const generated = generateStrongPassword(14);
    setCreatePassword(generated);
    setCreateCopied(false);
    toast.success("Password rekomendasi berhasil dibuat!");
  };

  const handleCopyCreatePassword = async () => {
    if (!createPassword) return;
    try {
      await navigator.clipboard.writeText(createPassword);
      setCreateCopied(true);
      toast.success("Password berhasil disalin ke clipboard!");
      setTimeout(() => setCreateCopied(false), 3000);
    } catch {
      toast.info(`Password: ${createPassword}`);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;

    if (newPassword.length < 8) {
      toast.error("Password baru minimal 8 karakter sesuai standar keamanan.");
      return;
    }

    if (!resetStrength.isComplete) {
      toast.error(
        "Password wajib mengombinasikan huruf besar, huruf kecil, angka, dan karakter khusus/simbol.",
      );
      return;
    }

    if (newPassword !== resetConfirmPassword) {
      toast.error("Konfirmasi password tidak cocok dengan password baru.");
      return;
    }

    setResetLoading(true);
    try {
      const { error } = await supabase.rpc("admin_reset_user_password", {
        _target_user_id: resetTarget.id,
        _new_password: newPassword,
      });

      if (error) {
        toast.error(`Gagal mereset password: ${error.message}`);
      } else {
        toast.success(`Password untuk akun ${resetTarget.email} berhasil diubah!`);
        setResetTarget(null);
        setNewPassword("");
        setResetConfirmPassword("");
        setResetCopied(false);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setResetLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const { error } = await supabase.rpc("admin_delete_user", {
        _target_user_id: deleteTarget.id,
      });

      if (error) {
        toast.error(`Gagal menghapus akun: ${error.message}`);
      } else {
        toast.success(`Akun ${deleteTarget.email} berhasil dihapus dari sistem`);
        setDeleteTarget(null);
        fetchUsers();
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleOpenEdit = (user: Row) => {
    setEditTarget(user);
    setEditName(user.full_name || "");
  };

  const handleSaveEditName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    const trimmed = editName.trim();
    if (!trimmed) {
      toast.error("Nama lengkap tidak boleh kosong");
      return;
    }

    setEditLoading(true);
    try {
      const res = await adminUpdateUserName(editTarget.id, trimmed);
      if (!res.success) {
        toast.error(`Gagal mengubah nama: ${res.error || "Terjadi kesalahan"}`);
        return;
      }

      toast.success(`Nama pengguna ${editTarget.email} berhasil diubah menjadi "${trimmed}"`);
      setRows((prev) =>
        prev ? prev.map((r) => (r.id === editTarget.id ? { ...r, full_name: trimmed } : r)) : prev,
      );
      setEditTarget(null);
      setEditName("");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setEditLoading(false);
    }
  };

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (rows ?? []).filter(
      (r) =>
        !s || r.email.toLowerCase().includes(s) || (r.full_name ?? "").toLowerCase().includes(s),
    );
  }, [rows, q]);

  return (
    <div className="space-y-6">
      {/* Header Info Banner & Action Button */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
            Pengguna & Hak Akses (RBAC)
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-2xl">
            Kelola akun petugas secara mandiri: buat akun baru, reset password, dan tentukan hak
            akses peran <strong>Admin</strong>, <strong>Security</strong>, atau{" "}
            <strong>Staff</strong>.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
          {/* Tombol Sinkronkan & Perbaiki Provider Akun */}
          <button
            type="button"
            disabled={repairLoading}
            onClick={handleRepairIdentities}
            title="Sinkronkan provider email di Supabase Auth untuk akun yang belum bisa login"
            className="inline-flex min-h-11 sm:min-h-10 items-center justify-center gap-2 rounded-xl border border-primary/30 bg-brand-soft px-4 py-2 text-xs font-semibold text-primary transition-all hover:bg-brand-soft/80 active:scale-95 disabled:opacity-60 whitespace-nowrap"
          >
            <RefreshCw className={`h-4 w-4 ${repairLoading ? "animate-spin" : ""}`} />
            <span>{repairLoading ? "Memperbaiki…" : "Sinkronkan Provider"}</span>
          </button>

          {/* Tombol Buat Akun Baru */}
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex min-h-11 sm:min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs sm:text-sm font-bold text-primary-foreground shadow-sm transition-all hover:brightness-110 active:scale-95 whitespace-nowrap"
          >
            <UserPlus className="h-4 w-4" />
            <span>+ Tambah Akun Petugas</span>
          </button>
        </div>
      </div>

      {/* Role explanation cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {AVAILABLE_ROLES.map((r) => (
          <div key={r.role} className="rounded-2xl border border-border bg-card p-3.5 shadow-xs">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${r.badgeClass}`}
              >
                {r.role === "security" && <Shield className="h-3.5 w-3.5" />}
                {r.role === "admin" && <ShieldAlert className="h-3.5 w-3.5" />}
                {r.role === "staff" && <ShieldCheck className="h-3.5 w-3.5" />}
                {r.label}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{r.desc}</p>
          </div>
        ))}
      </div>

      {/* Search Bar & Counter Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama atau email pengguna…"
            aria-label="Cari pengguna"
            className="min-h-11 w-full rounded-2xl border border-input bg-card pl-9 pr-9 text-xs sm:text-sm shadow-xs focus:ring-2 focus:ring-primary/20"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Hapus kata kunci pencarian"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <span className="inline-flex items-center self-start sm:self-auto rounded-xl bg-muted px-3 py-1.5 text-xs text-muted-foreground font-medium">
          Total: <strong className="text-foreground ml-1">{shown.length}</strong> akun
        </span>
      </div>

      {err && (
        <p role="alert" className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
          {err}
        </p>
      )}

      {/* Loading Skeletons */}
      {!rows && !err && (
        <>
          {/* Mobile Skeleton Cards */}
          <div className="space-y-3 md:hidden">
            {[1, 2, 3].map((k) => (
              <div
                key={k}
                className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-soft"
              >
                <div className="flex items-center justify-between">
                  <div className="h-4 w-36 rounded-full skeleton-shimmer" />
                  <div className="h-8 w-16 rounded-xl skeleton-shimmer opacity-70" />
                </div>
                <div className="h-3 w-48 rounded-full skeleton-shimmer opacity-80" />
                <div className="h-6 w-28 rounded-full skeleton-shimmer opacity-75" />
                <div className="grid grid-cols-3 gap-1.5 pt-2">
                  <div className="h-8 rounded-xl skeleton-shimmer" />
                  <div className="h-8 rounded-xl skeleton-shimmer" />
                  <div className="h-8 rounded-xl skeleton-shimmer" />
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table Skeleton */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
            <table className="w-full text-sm">
              <thead className="bg-brand-soft text-left text-foreground">
                <tr>
                  <th className="p-3.5">Nama & Profil</th>
                  <th className="p-3.5">Email</th>
                  <th className="p-3.5">Peran Aktif (RBAC)</th>
                  <th className="p-3.5 text-right">Kelola Hak Akses</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((k) => (
                  <tr key={k} className="border-t border-border">
                    <td className="p-3.5">
                      <div className="h-4 w-32 rounded-full skeleton-shimmer" />
                    </td>
                    <td className="p-3.5">
                      <div className="h-4 w-44 rounded-full skeleton-shimmer opacity-80" />
                    </td>
                    <td className="p-3.5">
                      <div className="h-5 w-24 rounded-full skeleton-shimmer opacity-85" />
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="h-6 w-32 rounded-full skeleton-shimmer opacity-70 ml-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Loaded Users */}
      {rows && (
        <>
          {/* Mobile Cards View (Visible on small screens) */}
          <div className="space-y-3 md:hidden">
            {shown.map((r) => {
              const isSelf = r.id === currentUserId;
              return (
                <div
                  key={r.id}
                  className="rounded-2xl border border-border bg-card p-4 shadow-soft space-y-3 transition-colors"
                >
                  {/* Top Row: User Name & Action Buttons */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-bold text-foreground text-sm truncate">
                          {r.full_name || "Tanpa Nama"}
                        </p>
                        {isSelf && (
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                            Akun Anda
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">
                        {r.email}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Terdaftar: {formatWibDate(r.created_at)}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(r)}
                        title="Edit Nama Pengguna"
                        aria-label="Edit Nama Pengguna"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-muted/40 text-muted-foreground hover:bg-brand-soft hover:text-primary transition-colors active:scale-95"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setResetTarget(r);
                          setNewPassword("");
                        }}
                        title="Ubah / Reset Password Akun"
                        aria-label="Reset Password"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-muted/40 text-muted-foreground hover:bg-brand-soft hover:text-primary transition-colors active:scale-95"
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={isSelf}
                        onClick={() => setDeleteTarget(r)}
                        title={
                          isSelf ? "Tidak dapat menghapus akun Anda sendiri" : "Hapus Akun Pengguna"
                        }
                        aria-label="Hapus Akun"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-destructive/20 bg-muted/40 text-destructive hover:bg-destructive/10 transition-colors active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Peran Aktif */}
                  <div className="pt-2 border-t border-border/70">
                    <span className="text-[11px] font-semibold text-muted-foreground block mb-1.5">
                      Peran Aktif:
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {r.roles.map((role) => {
                        const isSec = role === "security";
                        const isAdm = role === "admin";
                        const isStf = role === "staff";
                        return (
                          <span
                            key={role}
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              isAdm
                                ? "bg-primary text-primary-foreground"
                                : isSec
                                  ? "bg-emerald-600 text-white"
                                  : isStf
                                    ? "bg-amber-600 text-white"
                                    : "bg-muted text-foreground"
                            }`}
                          >
                            {isSec && <Shield className="h-3 w-3" />}
                            {isAdm && <ShieldAlert className="h-3 w-3" />}
                            {isStf && <ShieldCheck className="h-3 w-3" />}
                            {role.toUpperCase()}
                          </span>
                        );
                      })}
                      {r.is_employee && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-primary">
                          <UserCheck className="h-3 w-3" />
                          Karyawan
                        </span>
                      )}
                      {!r.roles.length && !r.is_employee && (
                        <span className="text-xs text-muted-foreground italic">
                          Belum ada peran
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Atur Hak Akses Toggle Grid */}
                  <div className="pt-2 border-t border-border/70">
                    <span className="text-[11px] font-semibold text-muted-foreground block mb-1.5">
                      Atur Hak Akses:
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {AVAILABLE_ROLES.map(({ role, label }) => {
                        const isAssigned = r.roles.includes(role);
                        const isBusy = loadingRole === `${r.id}-${role}`;
                        return (
                          <button
                            key={role}
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleToggleRole(r.id, role, isAssigned)}
                            className={`inline-flex min-h-9 items-center justify-center gap-1 rounded-xl px-2 py-1 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 ${
                              isAssigned
                                ? role === "admin"
                                  ? "bg-primary text-primary-foreground shadow-2xs hover:brightness-110"
                                  : role === "security"
                                    ? "bg-emerald-600 text-white shadow-2xs hover:bg-emerald-700"
                                    : "bg-amber-600 text-white shadow-2xs hover:bg-amber-700"
                                : "border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`}
                          >
                            {isBusy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <span>{isAssigned ? `✓ ${label}` : `+ ${label}`}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
            {!shown.length && (
              <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground text-sm">
                Tidak ditemukan pengguna yang cocok dengan pencarian Anda.
              </div>
            )}
          </div>

          {/* Desktop Table View (Visible on medium and large screens) */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
            <table className="w-full text-sm text-left">
              <thead className="bg-brand-soft text-foreground font-semibold">
                <tr>
                  <th className="p-3.5">Pengguna</th>
                  <th className="p-3.5">Email Akun</th>
                  <th className="p-3.5">Peran Saat Ini</th>
                  <th className="p-3.5 text-center">Atur Peran (Toggle)</th>
                  <th className="p-3.5 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {shown.map((r) => {
                  const isSelf = r.id === currentUserId;
                  return (
                    <tr key={r.id} className="transition-colors hover:bg-muted/30">
                      <td className="p-3.5 font-medium text-foreground">
                        <div>
                          <p className="font-semibold text-foreground flex items-center gap-1.5">
                            {r.full_name || "Tanpa Nama"}
                            {isSelf && (
                              <span className="rounded bg-primary/10 px-1.5 py-0.2 text-[10px] font-bold text-primary">
                                Akun Anda
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Terdaftar: {formatWibDate(r.created_at)}
                          </p>
                        </div>
                      </td>
                      <td className="p-3.5 text-muted-foreground font-mono text-xs">{r.email}</td>
                      <td className="p-3.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {r.roles.map((role) => {
                            const isSec = role === "security";
                            const isAdm = role === "admin";
                            const isStf = role === "staff";
                            return (
                              <span
                                key={role}
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                  isAdm
                                    ? "bg-primary text-primary-foreground"
                                    : isSec
                                      ? "bg-emerald-600 text-white"
                                      : isStf
                                        ? "bg-amber-600 text-white"
                                        : "bg-muted text-foreground"
                                }`}
                              >
                                {isSec && <Shield className="h-3 w-3" />}
                                {isAdm && <ShieldAlert className="h-3 w-3" />}
                                {isStf && <ShieldCheck className="h-3 w-3" />}
                                {role.toUpperCase()}
                              </span>
                            );
                          })}
                          {r.is_employee && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-primary">
                              <UserCheck className="h-3 w-3" />
                              Karyawan
                            </span>
                          )}
                          {!r.roles.length && !r.is_employee && (
                            <span className="text-xs text-muted-foreground italic">
                              Belum ada peran
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          {AVAILABLE_ROLES.map(({ role, label }) => {
                            const isAssigned = r.roles.includes(role);
                            const isBusy = loadingRole === `${r.id}-${role}`;
                            return (
                              <button
                                key={role}
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleToggleRole(r.id, role, isAssigned)}
                                title={
                                  isAssigned
                                    ? `Klik untuk mencabut role ${label}`
                                    : `Klik untuk memberi role ${label}`
                                }
                                className={`inline-flex min-h-7 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-all active:scale-95 disabled:opacity-50 ${
                                  isAssigned
                                    ? role === "admin"
                                      ? "bg-primary text-primary-foreground shadow-2xs hover:brightness-110"
                                      : role === "security"
                                        ? "bg-emerald-600 text-white shadow-2xs hover:bg-emerald-700"
                                        : "bg-amber-600 text-white shadow-2xs hover:bg-amber-700"
                                    : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                                }`}
                              >
                                {isBusy ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <span>{isAssigned ? `✓ ${label}` : `+ ${label}`}</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(r)}
                            title="Edit Nama Pengguna"
                            aria-label="Edit Nama Pengguna"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-brand-soft hover:text-primary transition-colors active:scale-90"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setResetTarget(r);
                              setNewPassword("");
                            }}
                            title="Ubah / Reset Password Akun"
                            aria-label="Reset Password"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-brand-soft hover:text-primary transition-colors active:scale-90"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => setDeleteTarget(r)}
                            title={
                              isSelf
                                ? "Tidak dapat menghapus akun Anda sendiri"
                                : "Hapus Akun Pengguna"
                            }
                            aria-label="Hapus Akun"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-destructive/20 bg-card text-destructive hover:bg-destructive/10 transition-colors active:scale-90 disabled:opacity-30 disabled:pointer-events-none"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!shown.length && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      Tidak ditemukan pengguna yang cocok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Dialog Buat Akun Baru */}
      <Dialog open={createOpen} onOpenChange={(o) => !createLoading && setCreateOpen(o)}>
        <DialogContent className="rounded-2xl max-w-md">
          <form onSubmit={handleCreateUser} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-soft text-primary">
                  <UserPlus className="h-4 w-4" />
                </span>
                Tambah Akun Petugas Baru
              </DialogTitle>
              <DialogDescription>
                Buat akun login langsung dari dashboard tanpa perlu membuka konsol Supabase.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Nama Lengkap Petugas
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Budi Santoso (Pos Jaga Lobi)"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full rounded-xl border border-input bg-card px-3.5 py-2 text-sm shadow-xs focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Email Login <span className="text-destructive">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="nama@nobu.id"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  className="w-full rounded-xl border border-input bg-card px-3.5 py-2 text-sm shadow-xs focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-foreground block">
                    Password Awal <span className="text-destructive">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    {createPassword && (
                      <button
                        type="button"
                        onClick={handleCopyCreatePassword}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                      >
                        {createCopied ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-600" />
                            <span className="text-emerald-600">Tersalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Salin</span>
                          </>
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleGenerateCreatePassword}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                    >
                      <Sparkles className="h-3 w-3 text-primary" />
                      <span>Generate Acak</span>
                    </button>
                  </div>
                </div>
                <PasswordInput
                  required
                  minLength={8}
                  placeholder="Minimal 8 karakter kombinasi"
                  value={createPassword}
                  onChange={(e) => {
                    setCreatePassword(e.target.value);
                    setCreateCopied(false);
                  }}
                  className="w-full rounded-xl border border-input bg-card px-3.5 py-2 text-base sm:text-sm shadow-xs focus:ring-2 focus:ring-primary/20"
                />
                {createPassword && (
                  <PasswordStrengthIndicator
                    strength={createStrength}
                    password={createPassword}
                    showCriteria={true}
                  />
                )}
              </div>

              <div className="rounded-xl border border-primary/20 bg-brand-soft/70 p-2.5 text-xs text-primary leading-relaxed">
                ✓ Akun otomatis terdaftar dengan provider <strong>email</strong> aktif di Supabase
                Auth sehingga bisa langsung dipakai login.
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Peran Akses Utama (Role)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {AVAILABLE_ROLES.map((r) => (
                    <button
                      key={r.role}
                      type="button"
                      onClick={() => setCreateRole(r.role)}
                      className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all ${
                        createRole === r.role
                          ? "border-primary bg-brand-soft text-primary font-bold shadow-xs"
                          : "border-border bg-card text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <span className="text-xs font-bold leading-tight">{r.label}</span>
                      <span className="text-[10px] opacity-75 mt-0.5">{r.role}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-border/60">
              <button
                type="button"
                disabled={createLoading}
                onClick={() => setCreateOpen(false)}
                className="w-full sm:w-auto min-h-11 sm:min-h-10 rounded-xl border border-input px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors active:scale-95"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={createLoading}
                className="w-full sm:w-auto inline-flex min-h-11 sm:min-h-10 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all"
              >
                {createLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" /> : null}
                <span>{createLoading ? "Membuat Akun..." : "Buat Akun Sekarang"}</span>
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Edit Nama Pengguna */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !editLoading && !o && setEditTarget(null)}>
        <DialogContent className="rounded-2xl max-w-sm">
          <form onSubmit={handleSaveEditName} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-soft text-primary">
                  <Pencil className="h-4 w-4" />
                </span>
                Edit Nama Pengguna
              </DialogTitle>
              <DialogDescription>
                Perbarui nama lengkap petugas untuk akun <strong>{editTarget?.email}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Nama Lengkap Petugas <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="Contoh: Budi Santoso (Pos Jaga)"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-xl border border-input bg-card px-3.5 py-2 text-sm shadow-xs focus:ring-2 focus:ring-primary/20"
              />
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Nama ini akan tampil di seluruh buku tamu, dashboard, dan riwayat audit aktivitas.
              </p>
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-border/60">
              <button
                type="button"
                disabled={editLoading}
                onClick={() => setEditTarget(null)}
                className="w-full sm:w-auto min-h-11 sm:min-h-10 rounded-xl border border-input px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors active:scale-95"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={editLoading}
                className="w-full sm:w-auto inline-flex min-h-11 sm:min-h-10 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all"
              >
                {editLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" /> : null}
                <span>{editLoading ? "Menyimpan..." : "Simpan Perubahan"}</span>
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Reset Password (Sesuai Best Practice Keamanan) */}
      <Dialog
        open={!!resetTarget}
        onOpenChange={(o) => {
          if (!resetLoading && !o) {
            setResetTarget(null);
            setNewPassword("");
            setResetConfirmPassword("");
            setResetCopied(false);
          }
        }}
      >
        <DialogContent className="w-[calc(100%-1.25rem)] sm:w-full max-w-md mx-auto rounded-3xl p-4 sm:p-6 max-h-[88dvh] overflow-y-auto">
          <form onSubmit={handleResetPassword} className="space-y-4">
            <DialogHeader className="pr-6 sm:pr-0 text-left">
              <DialogTitle className="flex items-center gap-2.5 text-base sm:text-lg font-bold text-foreground">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-soft text-primary shadow-xs shrink-0">
                  <KeyRound className="h-5 w-5" />
                </span>
                <span className="truncate">Reset Password Akun</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Tentukan kata sandi baru untuk akun <strong>{resetTarget?.email}</strong>.
              </DialogDescription>
            </DialogHeader>

            {/* Quick Action: Rekomendasi Password Generator */}
            <div className="rounded-2xl border border-primary/25 bg-brand-soft/50 p-3 sm:p-3.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                  <Sparkles className="h-4 w-4 shrink-0 text-primary" />
                  <span>Rekomendasi Password Kuat</span>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateResetPassword}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-card px-2.5 py-1 text-xs font-semibold text-primary shadow-2xs hover:bg-primary hover:text-primary-foreground transition-all active:scale-95 cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3 shrink-0" />
                  <span>Generate Acak</span>
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Menghasilkan 14 karakter kombinasi huruf besar, kecil, angka, dan simbol aman, serta
                otomatis mengisi kolom verifikasi.
              </p>
            </div>

            {/* Input Password Baru */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground block">
                  Password Baru <span className="text-destructive">*</span>
                </label>
                {newPassword && (
                  <button
                    type="button"
                    onClick={handleCopyResetPassword}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                  >
                    {resetCopied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-emerald-600 font-bold">Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Salin Password</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <PasswordInput
                required
                minLength={8}
                autoFocus
                placeholder="Minimal 8 karakter kombinasi"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setResetCopied(false);
                }}
                className="w-full min-h-11 sm:min-h-10 rounded-xl border border-input bg-card px-3.5 py-2 text-base sm:text-sm shadow-xs focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Live Strength Meter & Complexity Checklist */}
            {newPassword && (
              <PasswordStrengthIndicator
                strength={resetStrength}
                password={newPassword}
                showCriteria={true}
              />
            )}

            {/* Input Verifikasi Konfirmasi Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                Konfirmasi Password Baru <span className="text-destructive">*</span>
              </label>
              <PasswordInput
                required
                minLength={8}
                placeholder="Ketik ulang password baru untuk verifikasi"
                value={resetConfirmPassword}
                onChange={(e) => setResetConfirmPassword(e.target.value)}
                className="w-full min-h-11 sm:min-h-10 rounded-xl border border-input bg-card px-3.5 py-2 text-base sm:text-sm shadow-xs focus:ring-2 focus:ring-primary/20"
              />
              {resetConfirmPassword && (
                <div className="pt-0.5">
                  {newPassword === resetConfirmPassword ? (
                    <p className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <Check className="h-3.5 w-3.5" /> Konfirmasi password cocok & terverifikasi
                    </p>
                  ) : (
                    <p className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                      ⚠ Konfirmasi password belum sama
                    </p>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-border/60">
              <button
                type="button"
                disabled={resetLoading}
                onClick={() => {
                  setResetTarget(null);
                  setNewPassword("");
                  setResetConfirmPassword("");
                }}
                className="w-full sm:w-auto min-h-11 sm:min-h-10 rounded-xl border border-input px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors active:scale-95 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={
                  resetLoading ||
                  !resetStrength.isComplete ||
                  newPassword !== resetConfirmPassword ||
                  !newPassword
                }
                className="w-full sm:w-auto inline-flex min-h-11 sm:min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
              >
                {resetLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" /> : null}
                <span>{resetLoading ? "Menyimpan..." : "Simpan Password Baru"}</span>
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Konfirmasi Hapus Akun */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !deleteLoading && !o && setDeleteTarget(null)}
        title="Hapus akun pengguna?"
        description={`Akun "${deleteTarget?.email ?? ""}" akan dihapus permanen dari sistem otentikasi. Akun ini tidak akan dapat login kembali.`}
        confirmLabel={deleteLoading ? "Menghapus..." : "Hapus Akun"}
        destructive={true}
        onConfirm={handleDeleteUser}
      />
    </div>
  );
}
