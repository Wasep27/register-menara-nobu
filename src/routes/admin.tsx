import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { signOutLocal, startIdleLogout, supabase } from "@/lib/supabase";
import { SiteNav } from "@/components/SiteNav";
import { Avatar } from "@/components/Avatar";

import { ShieldCheck, Sparkles } from "lucide-react";

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
  }, [isLogin, loc.pathname, nav]);

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
      <p className="p-8 text-muted-foreground">
        Sesi berakhir karena tidak ada aktivitas. Silakan masuk lagi.
      </p>
    );
  if (state === "loading" || state === "out") {
    return (
      <div className="min-h-screen bg-background">
        {/* Placeholder Top Nav */}
        <header className="sticky top-0 z-40 border-b border-border/80 bg-card/80 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-28 rounded-xl skeleton-shimmer" />
              <div className="hidden h-5 w-px bg-border sm:block" />
              <div className="hidden h-4 w-32 rounded-full skeleton-shimmer opacity-70 sm:block" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-9 w-24 rounded-full skeleton-shimmer opacity-80" />
            </div>
          </div>
        </header>

        {/* Modern Interactive Auth & Loading Hero */}
        <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
          <div className="fade-up relative overflow-hidden rounded-3xl border border-brand/20 bg-gradient-to-r from-brand-soft/60 via-card to-card p-6 shadow-soft sm:p-8">
            <div className="flex flex-col items-center justify-center gap-5 text-center sm:flex-row sm:justify-start sm:text-left">
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
                <div className="absolute inset-0 animate-ping rounded-2xl bg-brand/20 opacity-60" />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-brand/30">
                  <ShieldCheck className="h-6 w-6 animate-pulse" />
                </div>
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                  <Sparkles className="h-3 w-3 animate-spin" />
                  Memeriksa Autentikasi
                </span>
                <h1 className="mt-1.5 font-display text-lg font-bold text-foreground sm:text-xl">
                  Memverifikasi Akses Dashboard Admin...
                </h1>
                <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                  Menghubungkan sesi ke server Supabase & memuat data terbaru Menara Nobu.
                </p>
              </div>
            </div>
          </div>

          {/* Skeleton Preview of Dashboard to prevent layout shift */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[1, 2, 3, 4].map((k) => (
              <div key={k} className="rounded-2xl border border-border/80 bg-card p-4 shadow-soft">
                <div className="flex items-center justify-between">
                  <div className="h-3.5 w-20 rounded-full skeleton-shimmer" />
                  <div className="h-4 w-4 rounded-full skeleton-shimmer opacity-70" />
                </div>
                <div className="mt-3 h-7 w-16 rounded-lg skeleton-shimmer" />
                <div className="mt-2 h-3 w-28 rounded-full skeleton-shimmer opacity-60" />
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <div className="h-5 w-40 rounded-full skeleton-shimmer" />
              <div className="h-4 w-24 rounded-full skeleton-shimmer opacity-60" />
            </div>
            <div className="space-y-3 py-2">
              {[1, 2, 3, 4].map((k) => (
                <div
                  key={k}
                  className="flex items-center gap-4 border-b border-border/60 p-3 last:border-0"
                >
                  <div className="h-4 w-24 rounded-full skeleton-shimmer" />
                  <div className="h-4 w-36 rounded-full skeleton-shimmer" />
                  <div className="h-4 w-28 rounded-full skeleton-shimmer opacity-80" />
                  <div className="h-5 w-20 rounded-full skeleton-shimmer opacity-85" />
                  <div className="ml-auto h-4 w-12 rounded-full skeleton-shimmer opacity-50" />
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
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
        right={
          <div className="flex w-full items-center gap-2 md:w-auto">
            <span className="flex min-w-0 items-center gap-2 rounded-full bg-brand-soft py-1 pl-1 pr-3">
              <Avatar name={name || "Admin"} size="sm" />
              <span className="max-w-32 truncate text-sm font-semibold text-primary">
                {name || "Admin"}
              </span>
            </span>
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
      <div key={loc.pathname} className="fade-up mx-auto max-w-6xl p-4 md:p-6">
        <Outlet />
      </div>
    </div>
  );
}
