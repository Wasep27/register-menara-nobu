import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase, type AppRole } from "@/lib/supabase";
import { toast } from "sonner";
import { Shield, ShieldAlert, ShieldCheck, UserCheck, Loader2 } from "lucide-react";

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

  const fetchUsers = () => {
    supabase.rpc("list_users_with_roles").then(({ data, error }) => {
      if (error)
        setErr("Gagal memuat pengguna. Pastikan schema.sql terbaru sudah dijalankan di Supabase.");
      else setRows((data ?? []) as Row[]);
    });
  };

  useEffect(() => {
    fetchUsers();
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

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (rows ?? []).filter(
      (r) =>
        !s || r.email.toLowerCase().includes(s) || (r.full_name ?? "").toLowerCase().includes(s),
    );
  }, [rows, q]);

  return (
    <div className="space-y-6">
      {/* Header Info Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Pengguna & Hak Akses (RBAC)
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kelola hak akses berjenjang: <strong>Admin</strong> (Super Admin),{" "}
            <strong>Security</strong> (Pos Pindai Pass & Verifikasi), dan <strong>Staff</strong>{" "}
            (Front Desk Lobi).
          </p>
        </div>
      </div>

      {/* Role explanation cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {AVAILABLE_ROLES.map((r) => (
          <div key={r.role} className="rounded-2xl border border-border bg-card p-3.5 shadow-xs">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${r.badgeClass}`}
              >
                {r.role === "security" && <Shield className="h-3 w-3" />}
                {r.role === "admin" && <ShieldAlert className="h-3 w-3" />}
                {r.role === "staff" && <ShieldCheck className="h-3 w-3" />}
                {r.label}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{r.desc}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari nama atau email pengguna…"
          aria-label="Cari pengguna"
          className="min-h-11 w-full rounded-xl border border-input bg-card px-4 sm:max-w-md shadow-xs focus:ring-2 focus:ring-primary/20"
        />
        <span className="text-xs text-muted-foreground shrink-0 font-medium">
          Total: {shown.length} akun
        </span>
      </div>

      {err && (
        <p role="alert" className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
          {err}
        </p>
      )}

      {!rows && !err && (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
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
      )}

      {rows && (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
          <table className="w-full text-sm text-left">
            <thead className="bg-brand-soft text-foreground font-semibold">
              <tr>
                <th className="p-3.5">Pengguna</th>
                <th className="p-3.5">Email Akun</th>
                <th className="p-3.5">Peran Saat Ini</th>
                <th className="p-3.5 text-center">Atur Peran (Klik untuk Toggle)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shown.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-muted/30">
                  <td className="p-3.5 font-medium text-foreground">
                    <div>
                      <p className="font-semibold text-foreground">{r.full_name || "Tanpa Nama"}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Terdaftar: {new Date(r.created_at).toLocaleDateString("id-ID")}
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
                    <div className="flex items-center justify-center gap-2">
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
                            className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 ${
                              isAssigned
                                ? role === "admin"
                                  ? "bg-primary text-primary-foreground shadow-xs hover:brightness-110"
                                  : role === "security"
                                    ? "bg-emerald-600 text-white shadow-xs hover:bg-emerald-700"
                                    : "bg-amber-600 text-white shadow-xs hover:bg-amber-700"
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
                </tr>
              ))}
              {!shown.length && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted-foreground">
                    Tidak ditemukan pengguna yang cocok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
