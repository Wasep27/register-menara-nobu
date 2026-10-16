import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { SiteNav } from "@/components/SiteNav";

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
  { to: "/panduan", label: "Panduan" },
] as const;

function AdminLayout() {
  const loc = useLocation();
  const nav = useNavigate();
  const [state, setState] = useState<"loading" | "ok" | "noadmin" | "out">("loading");
  const isLogin = loc.pathname === "/admin/login";

  useEffect(() => {
    if (isLogin) return;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { setState("out"); nav({ to: "/admin/login" }); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
      setState(roles?.some((r) => r.role === "admin") ? "ok" : "noadmin");
    });
  }, [isLogin, loc.pathname, nav]);

  if (isLogin) return <Outlet />;
  if (state === "loading" || state === "out") return <p className="p-8 text-muted-foreground">Memuat…</p>;
  if (state === "noadmin")
    return (
      <div className="p-8">
        <p className="text-foreground">Akun ini belum memiliki akses admin.</p>
        <button className="mt-4 rounded-lg border border-input px-4 py-2" onClick={() => supabase.auth.signOut().then(() => nav({ to: "/admin/login" }))}>Keluar</button>
      </div>
    );

  return (
    <div className="min-h-screen bg-background">
      <SiteNav items={[...links]} right={<button className="min-h-11 w-full rounded-full px-4 text-left text-sm font-medium text-muted-foreground hover:bg-brand-soft hover:text-primary md:w-auto" onClick={() => supabase.auth.signOut().then(() => nav({ to: "/admin/login" }))}>Keluar</button>} />
      <div key={loc.pathname} className="fade-up mx-auto max-w-6xl p-4 md:p-6"><Outlet /></div>
    </div>
  );
}
