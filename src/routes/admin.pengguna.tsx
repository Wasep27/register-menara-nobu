import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin/pengguna")({
  head: () => ({
    meta: [
      { title: "Pengguna & Role — Admin Menara Nobu" },
      { name: "description", content: "Lihat nama, email, dan role setiap pengguna." },
      { property: "og:title", content: "Pengguna & Role — Admin Menara Nobu" },
      { property: "og:description", content: "Lihat nama, email, dan role setiap pengguna." },
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

function UsersPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    supabase.rpc("list_users_with_roles").then(({ data, error }) => {
      if (error)
        setErr("Gagal memuat pengguna. Pastikan schema.sql terbaru sudah dijalankan di Supabase.");
      else setRows((data ?? []) as Row[]);
    });
  }, []);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (rows ?? []).filter(
      (r) =>
        !s || r.email.toLowerCase().includes(s) || (r.full_name ?? "").toLowerCase().includes(s),
    );
  }, [rows, q]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Pengguna & Role</h1>
        <p className="text-sm text-muted-foreground">
          Role diatur lewat halaman Email Admin; halaman ini hanya menampilkan.
        </p>
      </div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Cari nama atau email…"
        aria-label="Cari pengguna"
        className="min-h-11 w-full rounded-xl border border-input bg-card px-4 sm:max-w-sm"
      />
      {err && (
        <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
          {err}
        </p>
      )}
      {!rows && !err && <p className="text-muted-foreground">Memuat…</p>}
      {rows && (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-brand-soft text-left text-foreground">
              <tr>
                <th className="p-3">Nama</th>
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
                <th className="p-3">Terdaftar</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3 font-medium text-foreground">{r.full_name || "—"}</td>
                  <td className="p-3 text-muted-foreground">{r.email}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1.5">
                      {r.roles.map((role) => (
                        <span
                          key={role}
                          className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground"
                        >
                          {role === "admin" ? "Admin" : role}
                        </span>
                      ))}
                      {r.is_employee && (
                        <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-primary">
                          Karyawan
                        </span>
                      )}
                      {!r.roles.length && !r.is_employee && (
                        <span className="text-xs text-muted-foreground">Pengguna biasa</span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("id-ID")}
                  </td>
                </tr>
              ))}
              {!shown.length && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-muted-foreground">
                    Tidak ada pengguna.
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
