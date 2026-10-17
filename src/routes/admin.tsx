import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { signOutLocal, startIdleLogout, supabase } from "@/lib/supabase";
import { SiteNav } from "@/components/SiteNav";
import { Avatar } from "@/components/Avatar";

import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Dashboard Admin — Menara Nobu" },
      { name: "description", content: "Kelola data tamu, karyawan, dan laporan kunjungan." },
      { property: "og:title", content: "Dashboard Admin — Menara Nobu" },
      { property: "og:description", content: "Kelola data tamu, karyawan, dan laporan kunjungan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminLayout,
});

const links = [
  { to: "/admin", label: "Ringkasan" },
  { to: "/admin/tamu", label: "Tamu" },
  { to: "/admin/karyawan", label: "Karyawan" },
  { to: "/admin/tujuan", label: "Tujuan" },
  { to: "/admin/laporan", label: "Laporan" },
  { to: "/admin/feedback", label: "Feedback" },
  { to: "/admin/aktivitas", label: "Log Aktivitas" },
  { to: "/admin/email-admin", label: "Email Admin" },
  { to: "/admin/pengguna", label: "Pengguna" },
  { to: "/admin/panduan", label: "Panduan Teknis" },
] as const;

function AdminLayout() {
  const loc = useLocation();
  const nav = useNavigate();
  const [state, setState] = useState<"loading" | "ok" | "noadmin" | "out">("loading");
  const [idle, setIdle] = useState(false);
  const [name, setName] = useState("");
  const isLogin = loc.pathname === "/admin/login";

  // Periksa ulang akses ke server (getUser memvalidasi token, bukan hanya membaca lokal)
  useEffect(() => {
    if (isLogin || !loc.pathname.startsWith("/admin")) return;
    if (state === "ok") return;

    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        setState("out");
        if (!window.location.pathname.startsWith("/admin")) return;
        nav({ to: "/admin/login" });
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);
      setState(roles?.some((r) => r.role === "admin") ? "ok" : "noadmin");
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", data.user.id)
        .maybeSingle();
      setName(prof?.full_name || data.user.email?.split("@")[0] || "Admin");
    });
  }, [isLogin, loc.pathname, nav, state]);

  // Satu pendengar perubahan sesi: keluar di tab lain / token habis -> ke halaman login
  useEffect(() => {
    if (isLogin) return;
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setState("out");
        nav({ to: "/admin/login" });
      }
    });
    return () => data.subscription.unsubscribe();
  }, [isLogin, nav]);

  // Keluar otomatis setelah 30 menit tanpa aktivitas
  useEffect(() => {
    if (state !== "ok") return;
    return startIdleLogout(() => {
      setIdle(true);
      void signOutLocal();
    });
  }, [state]);

  const [askLogout, setAskLogout] = useState(false);
  const logout = async () => {
    await signOutLocal();
    toast.success("Anda berhasil keluar");
    nav({ to: "/admin/login" });
  };

  if (isLogin) return <Outlet />;
  if (idle)
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-soft">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h2 className="font-display text-base font-bold text-foreground">Sesi Berakhir</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Sesi Anda berakhir karena tidak ada aktivitas. Silakan masuk kembali.
          </p>
          <button
            onClick={() => nav({ to: "/admin/login" })}
            className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl bg-primary text-xs font-semibold text-primary-foreground hover:brightness-110 active:scale-95"
          >
            Masuk Kembali
          </button>
        </div>
      </main>
    );

  if (state === "loading" || state === "out") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="relative mb-3 flex h-10 w-10 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
          </div>
          <p className="text-sm font-medium text-foreground">Memeriksa autentikasi…</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Menghubungkan ke sesi Anda</p>
        </div>
      </main>
    );
  }
  if (state === "noadmin")
    return (
      <div className="p-8">
        <p className="text-foreground">Akun ini belum memiliki akses admin.</p>
        <button className="mt-4 rounded-lg border border-input px-4 py-2" onClick={logout}>
          Keluar
        </button>
      </div>
    );

  return (
    <div className="min-h-screen bg-background">
      <SiteNav
        items={[...links]}
        userName={name}
        onLogout={() => setAskLogout(true)}
        right={
          <div className="flex w-full items-center gap-2 md:w-auto">
            <button
              type="button"
              title={`Akun: ${name || "Admin"} — Buka profil & semua menu`}
              onClick={() => window.dispatchEvent(new CustomEvent("toggle-sitenav-drawer"))}
              className="flex shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <Avatar name={name || "Admin"} size="sm" />
            </button>
            <button
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-destructive/30 px-4 text-sm font-semibold text-destructive transition-all hover:bg-destructive hover:text-destructive-foreground active:scale-95"
              onClick={() => setAskLogout(true)}
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Keluar
            </button>
          </div>
        }
      />
      <ConfirmDialog
        open={askLogout}
        onOpenChange={setAskLogout}
        title="Keluar dari dashboard?"
        description="Sesi admin di perangkat ini akan diakhiri. Anda perlu masuk lagi untuk melanjutkan."
        confirmLabel="Keluar"
        destructive={false}
        onConfirm={logout}
      />
      <div key={loc.pathname} className="fade-up mx-auto max-w-6xl p-4 pb-28 md:p-6 md:pb-8">
        <Outlet />
      </div>
    </div>
  );
}
