import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { signOutLocal, startIdleLogout, supabase, type AppRole } from "@/lib/supabase";
import { SiteNav } from "@/components/SiteNav";
import { LogOut, ShieldAlert, ShieldCheck, Users } from "lucide-react";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Avatar } from "@/components/Avatar";

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
  { to: "/admin/scan", label: "Pindai Pass" },
  { to: "/admin/karyawan", label: "Karyawan" },
  { to: "/admin/tujuan", label: "Tujuan" },
  { to: "/admin/laporan", label: "Laporan" },
  { to: "/admin/feedback", label: "Feedback" },
  { to: "/admin/aktivitas", label: "Log Aktivitas" },
  { to: "/admin/email-admin", label: "Email Admin" },
  { to: "/admin/pengguna", label: "Pengguna" },
  { to: "/admin/panduan", label: "Panduan Teknis" },
] as const;

const PAGE_TITLES: Record<string, string> = {
  "/admin": "Ringkasan",
  "/admin/tamu": "Buku Tamu",
  "/admin/scan": "Pos Verifikasi & Pemindai Pass",
  "/admin/karyawan": "Direktori Karyawan",
  "/admin/tujuan": "Tujuan Kunjungan",
  "/admin/laporan": "Laporan & Ekspor",
  "/admin/feedback": "Feedback Tamu",
  "/admin/aktivitas": "Log Aktivitas",
  "/admin/email-admin": "Email Notifikasi",
  "/admin/pengguna": "Pengguna & Hak Akses",
  "/admin/panduan": "Panduan Teknis",
};

import { AdminRoleContext, type AdminRoleContextType } from "@/hooks/useAdminRole";

const SECURITY_ALLOWED_ROUTES = ["/admin", "/admin/scan", "/admin/tamu", "/admin/karyawan"];
const STAFF_ALLOWED_ROUTES = [
  "/admin",
  "/admin/tamu",
  "/admin/scan",
  "/admin/karyawan",
  "/admin/feedback",
];

function AdminLayout() {
  const loc = useLocation();
  const nav = useNavigate();
  const [state, setState] = useState<"loading" | "ok" | "noadmin" | "out">("loading");
  const [userRoles, setUserRoles] = useState<AppRole[]>([]);
  const [idle, setIdle] = useState(false);
  const [name, setName] = useState("");
  const isLogin = loc.pathname === "/admin/login";
  const currentTitle = PAGE_TITLES[loc.pathname] || "Dashboard Staf";

  const isAdmin = userRoles.includes("admin");
  const isSecurity = userRoles.includes("security") && !isAdmin;
  const isStaff = userRoles.includes("staff") && !isAdmin && !userRoles.includes("security");

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

      const assigned = roles?.map((r) => r.role as AppRole) ?? [];
      setUserRoles(assigned);
      const isAllowed = assigned.length > 0;
      setState(isAllowed ? "ok" : "noadmin");

      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", data.user.id)
        .maybeSingle();
      setName(prof?.full_name || data.user.email?.split("@")[0] || "Petugas");
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

  const isRouteUnauthorized =
    (isSecurity && !SECURITY_ALLOWED_ROUTES.includes(loc.pathname)) ||
    (isStaff && !STAFF_ALLOWED_ROUTES.includes(loc.pathname));

  const permittedLinks = links.filter((l) => {
    if (isAdmin) return true;
    if (isSecurity) return SECURITY_ALLOWED_ROUTES.includes(l.to);
    if (isStaff) return STAFF_ALLOWED_ROUTES.includes(l.to);
    return true;
  });

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
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 sm:p-8 text-center shadow-soft">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h2 className="font-display text-base sm:text-lg font-bold text-foreground">
            Belum Memiliki Hak Akses
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Akun Anda belum memiliki peran aktif (Admin, Petugas Keamanan, atau Staf). Silakan
            hubungi Administrator Sistem untuk aktivasi peran.
          </p>
          <button
            onClick={logout}
            className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-xl border border-input bg-card text-xs font-semibold text-foreground hover:bg-muted active:scale-95 transition-all"
          >
            Keluar dari Sesi
          </button>
        </div>
      </main>
    );

  return (
    <div className="min-h-screen bg-background">
      {/* Navigasi Mobile (< md): Header mengambang & dock bawah dibuat sticky */}
      <div className="md:hidden sticky top-0 z-40">
        <SiteNav
          items={[...permittedLinks]}
          userName={name}
          onLogout={() => setAskLogout(true)}
          isDashboard={true}
          hideRegistration={isSecurity}
          right={
            <button
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-destructive/30 px-3 text-xs font-semibold text-destructive transition-all hover:bg-destructive hover:text-destructive-foreground active:scale-95"
              onClick={() => setAskLogout(true)}
            >
              <LogOut className="h-3.5 w-3.5" />
              Keluar
            </button>
          }
        />
      </div>

      {/* Layout Desktop Modern (md ke atas): Sidebar Mengambang dengan Radius */}
      <div className="mx-auto flex max-w-[1440px] items-start gap-4 p-3 md:p-4 lg:gap-6">
        {/* Sidebar Mengambang Desktop */}
        <AdminSidebar userName={name} onLogout={() => setAskLogout(true)} userRoles={userRoles} />

        {/* Viewport Konten Utama */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Top Bar Kontekstual Desktop: STICKY mengambang tetap terlihat saat halaman discroll */}
          <header className="sticky top-3 md:top-4 z-30 hidden md:flex items-center justify-between gap-4 mb-4 rounded-2xl border border-border/80 bg-card/95 px-5 py-3 shadow-soft backdrop-blur-xl transition-all">
            <div className="flex items-center gap-2 text-sm min-w-0">
              <Link
                to={isSecurity ? "/admin/scan" : "/admin"}
                className="font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                {isSecurity ? "Pos Jaga" : "Dashboard"}
              </Link>
              <span className="text-muted-foreground/40 font-normal">/</span>
              <span className="font-bold text-foreground truncate">{currentTitle}</span>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {!isSecurity && (
                <Link
                  to="/registrasi"
                  className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-brand-soft px-3.5 py-1.5 text-xs font-semibold text-primary transition-all hover:bg-primary hover:text-primary-foreground active:scale-95 shadow-2xs"
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>Buku Tamu Depan</span>
                </Link>
              )}

              {/* Avatar saja tanpa nama di sampingnya agar clean */}
              <div
                title={`Akun: ${name || "Petugas"}`}
                className="flex shrink-0 items-center justify-center rounded-full p-0.5 border border-border/80 bg-card shadow-2xs hover:border-primary/50 transition-all cursor-default"
              >
                <Avatar name={name || "Admin"} size="sm" />
              </div>

              <button
                type="button"
                onClick={() => setAskLogout(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-destructive/25 px-3.5 py-1.5 text-xs font-semibold text-destructive transition-all hover:bg-destructive hover:text-destructive-foreground active:scale-95"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Keluar</span>
              </button>
            </div>
          </header>

          {/* Area Halaman */}
          <main key={loc.pathname} className="fade-up flex-1 pb-24 md:pb-6">
            <AdminRoleContext.Provider
              value={{ userRoles, isAdmin, isSecurity, isStaff, userName: name }}
            >
              {isRouteUnauthorized ? (
                <div className="mx-auto my-12 max-w-md rounded-3xl border border-amber-500/30 bg-card p-6 sm:p-8 text-center shadow-soft">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <ShieldAlert className="h-7 w-7" />
                  </div>
                  <h2 className="font-display text-lg font-bold text-foreground">Akses Terbatas</h2>
                  <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Halaman ini memerlukan hak akses <strong>Administrator Gedung</strong>. Sebagai{" "}
                    <strong>{isSecurity ? "Petugas Keamanan" : "Staf Resepsionis"}</strong>, area
                    operasional Anda berada di pos jaga dan lobi.
                  </p>
                  <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2">
                    <Link
                      to={isSecurity ? "/admin/scan" : "/admin/tamu"}
                      className="inline-flex min-h-10 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-primary px-5 text-xs font-semibold text-primary-foreground hover:brightness-110 active:scale-95 transition-all"
                    >
                      {isSecurity ? "Buka Pos Pindai Pass" : "Buka Buku Tamu"}
                    </Link>
                  </div>
                </div>
              ) : (
                <Outlet />
              )}
            </AdminRoleContext.Provider>
          </main>
        </div>
      </div>

      <ConfirmDialog
        open={askLogout}
        onOpenChange={setAskLogout}
        title="Keluar dari dashboard?"
        description="Sesi admin di perangkat ini akan diakhiri. Anda perlu masuk lagi untuk melanjutkan."
        confirmLabel="Keluar"
        destructive={false}
        onConfirm={logout}
      />
    </div>
  );
}
