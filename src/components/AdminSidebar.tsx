import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  BookOpen,
  Building2,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Mail,
  MessageSquareHeart,
  PanelLeftClose,
  PanelLeftOpen,
  QrCode,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import logo from "@/assets/logo.png";
import { Avatar } from "@/components/Avatar";

import type { AppRole } from "@/lib/supabase";

export interface AdminSidebarProps {
  userName?: string;
  onLogout?: () => void;
  userRoles?: AppRole[];
}

interface NavMenuItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

interface NavGroup {
  title: string;
  items: NavMenuItem[];
}

const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    title: "Menu Utama",
    items: [
      {
        to: "/admin",
        label: "Ringkasan",
        icon: LayoutDashboard,
        description: "Statistik & ikhtisar sistem",
      },
      {
        to: "/admin/tamu",
        label: "Buku Tamu",
        icon: Users,
        description: "Kelola check-in & daftar hadir",
      },
      {
        to: "/admin/laporan",
        label: "Laporan & Ekspor",
        icon: BarChart3,
        description: "Grafik analitik & unduh data",
      },
      {
        to: "/admin/aktivitas",
        label: "Log Aktivitas",
        icon: Activity,
        description: "Jejak audit & riwayat kerja",
      },
    ],
  },
  {
    title: "Operasional & Master",
    items: [
      {
        to: "/admin/scan",
        label: "Pindai QR / Pass",
        icon: QrCode,
        description: "Verifikasi badge & pos sekuriti",
      },
      {
        to: "/admin/karyawan",
        label: "Karyawan",
        icon: UserCheck,
        description: "Direktori staf penerima tamu",
      },
      {
        to: "/admin/tujuan",
        label: "Tujuan Kunjungan",
        icon: Building2,
        description: "Divisi & ruang pertemuan",
      },
      {
        to: "/admin/feedback",
        label: "Feedback Tamu",
        icon: MessageSquareHeart,
        description: "Indeks kepuasan pengunjung",
      },
    ],
  },
  {
    title: "Sistem & Konfigurasi",
    items: [
      {
        to: "/admin/email-admin",
        label: "Email Notifikasi",
        icon: Mail,
        description: "Penerima notifikasi sistem",
      },
      {
        to: "/admin/pengguna",
        label: "Akun Pengguna",
        icon: ShieldCheck,
        description: "Manajemen hak akses admin",
      },
      {
        to: "/admin/panduan",
        label: "Panduan Teknis",
        icon: BookOpen,
        description: "Dokumentasi & buku petunjuk",
      },
    ],
  },
];

const SECURITY_NAV_GROUPS: NavGroup[] = [
  {
    title: "Pos Keamanan & Jaga",
    items: [
      {
        to: "/admin",
        label: "Ringkasan Pos Jaga",
        icon: LayoutDashboard,
        description: "Ikhtisar operasional pos",
      },
      {
        to: "/admin/scan",
        label: "Pos Pindai Pass",
        icon: QrCode,
        description: "Pindai barcode & verifikasi fisik",
      },
      {
        to: "/admin/tamu",
        label: "Buku Tamu Hari Ini",
        icon: Users,
        description: "Daftar kehadiran & validasi",
      },
      {
        to: "/admin/karyawan",
        label: "Direktori Host",
        icon: UserCheck,
        description: "Cari kontak karyawan penerima",
      },
    ],
  },
];

const STAFF_NAV_GROUPS: NavGroup[] = [
  {
    title: "Operasional Front Desk",
    items: [
      {
        to: "/admin",
        label: "Ringkasan Lobi",
        icon: LayoutDashboard,
        description: "Statistik harian front desk",
      },
      {
        to: "/admin/tamu",
        label: "Buku Tamu Lobi",
        icon: Users,
        description: "Kelola check-in & cetak kartu",
      },
      {
        to: "/admin/scan",
        label: "Pindai Pass",
        icon: QrCode,
        description: "Verifikasi barcode undangan",
      },
      {
        to: "/admin/karyawan",
        label: "Direktori Karyawan",
        icon: UserCheck,
        description: "Daftar staf penerima tamu",
      },
      {
        to: "/admin/feedback",
        label: "Feedback Tamu",
        icon: MessageSquareHeart,
        description: "Indeks kepuasan pengunjung",
      },
    ],
  },
];

export function AdminSidebar({ userName, onLogout, userRoles = ["admin"] }: AdminSidebarProps) {
  const pathname = useLocation().pathname;
  const isAdmin = userRoles.includes("admin");
  const isSecurityOnly = userRoles.includes("security") && !isAdmin;
  const isStaffOnly = userRoles.includes("staff") && !isAdmin && !userRoles.includes("security");

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("nobu_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("nobu_sidebar_collapsed", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Shortcut '[' atau 'Ctrl+B' untuk toggle sidebar
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "[" || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b")) {
        e.preventDefault();
        toggleCollapsed();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const navGroups = isAdmin
    ? ADMIN_NAV_GROUPS
    : isSecurityOnly
      ? SECURITY_NAV_GROUPS
      : isStaffOnly
        ? STAFF_NAV_GROUPS
        : ADMIN_NAV_GROUPS;

  const userRoleDescription = isAdmin
    ? "Admin Menara Nobu"
    : isSecurityOnly
      ? "Petugas Keamanan Lobi"
      : isStaffOnly
        ? "Resepsionis Front Desk"
        : "Staf Operasional";

  const isItemActive = (to: string) => {
    if (to === "/admin") {
      return pathname === "/admin";
    }
    return pathname === to || pathname.startsWith(to + "/");
  };

  const focusRing =
    "outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card";

  return (
    <aside
      aria-label="Navigasi Admin Desktop"
      className={`hidden md:flex flex-col shrink-0 sticky top-4 h-[calc(100vh-2rem)] rounded-3xl border border-border/80 bg-card/90 shadow-soft backdrop-blur-xl overflow-hidden z-30 select-none transition-all duration-300 ease-in-out ${
        collapsed ? "w-20 p-2.5 items-center" : "w-64 lg:w-72 p-4"
      }`}
    >
      {/* Brand Header */}
      <div
        className={`flex items-center pb-3.5 mb-2 border-b border-border/60 shrink-0 ${
          collapsed ? "justify-center flex-col gap-2 w-full" : "justify-between w-full"
        }`}
      >
        <Link
          to="/admin"
          aria-label="Menara Nobu"
          title="Menara Nobu"
          className={`${focusRing} flex items-center rounded-2xl group transition-all`}
        >
          <img
            src={logo}
            alt="Menara Nobu"
            className={`${
              collapsed ? "h-7 w-auto" : "h-8 w-auto"
            } shrink-0 transition-transform duration-300 group-hover:scale-105`}
          />
        </Link>

        {/* Toggle Collapse Button */}
        <button
          type="button"
          onClick={toggleCollapsed}
          title={collapsed ? "Perluas sidebar (tekan [)" : "Ciutkan sidebar (tekan [)"}
          aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
          className={`${focusRing} flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-muted/40 text-muted-foreground transition-all hover:bg-brand-soft hover:text-primary hover:border-primary/30 active:scale-95`}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Nav List with Slim Custom Scrollbar */}
      <nav
        aria-label="Menu navigasi sidebar"
        className={`flex-1 overflow-y-auto overflow-x-hidden space-y-3.5 ${
          collapsed ? "w-full py-1" : "w-full pr-1 -mr-1 text-left"
        }`}
      >
        {navGroups.map((group, groupIdx) => (
          <div key={group.title} className={collapsed ? "space-y-1.5" : "space-y-1"}>
            {collapsed ? (
              groupIdx > 0 && <div className="h-px w-8 mx-auto my-2 bg-border/60" />
            ) : (
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                {group.title}
              </div>
            )}
            <div className={collapsed ? "space-y-1.5 flex flex-col items-center" : "space-y-0.5"}>
              {group.items.map((item) => {
                const active = isItemActive(item.to);
                const IconComponent = item.icon;

                if (collapsed) {
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      title={`${item.label} — ${item.description}`}
                      aria-label={item.label}
                      aria-current={active ? "page" : undefined}
                      className={`${focusRing} group relative flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-200 active:scale-95 ${
                        active
                          ? "bg-brand-soft text-primary shadow-xs border border-primary/30 font-semibold"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground border border-transparent"
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors ${
                          active
                            ? "bg-primary text-primary-foreground shadow-xs shadow-primary/30"
                            : "bg-muted/60 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                        }`}
                      >
                        <IconComponent className="h-4 w-4" />
                      </div>
                      {active && (
                        <span
                          aria-hidden
                          className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full border border-card bg-primary animate-pulse"
                        />
                      )}
                    </Link>
                  );
                }

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    aria-current={active ? "page" : undefined}
                    className={`${focusRing} group flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm transition-all duration-200 active:scale-[0.98] ${
                      active
                        ? "bg-brand-soft font-semibold text-primary shadow-xs border border-primary/20"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border border-transparent"
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors ${
                        active
                          ? "bg-primary text-primary-foreground shadow-xs shadow-primary/30"
                          : "bg-muted/60 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                      }`}
                    >
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1 truncate">
                      <p
                        className={`truncate text-xs font-semibold leading-tight ${
                          active ? "text-primary font-bold" : "text-foreground"
                        }`}
                      >
                        {item.label}
                      </p>
                      <p className="truncate text-[10px] text-muted-foreground/80 mt-0.5">
                        {item.description}
                      </p>
                    </div>
                    {active && (
                      <span
                        aria-hidden
                        className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary animate-pulse"
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer Area: Shortcut to Frontdesk + User Profile */}
      <div
        className={`pt-3 mt-2 border-t border-border/60 shrink-0 w-full ${collapsed ? "flex flex-col items-center gap-2" : "space-y-2.5"}`}
      >
        {/* Link to public front registration (hidden for security) */}
        {!isSecurityOnly &&
          (collapsed ? (
            <Link
              to="/registrasi"
              title="Buka Buku Tamu Depan"
              aria-label="Buku Tamu Depan"
              className={`${focusRing} flex h-10 w-10 items-center justify-center rounded-2xl border border-border/60 bg-muted/30 text-primary transition-all hover:bg-brand-soft hover:border-primary/40`}
            >
              <Users className="h-4 w-4" />
            </Link>
          ) : (
            <Link
              to="/registrasi"
              className={`${focusRing} group flex items-center justify-between rounded-2xl border border-border/60 bg-muted/30 px-3 py-2 text-xs font-medium text-foreground transition-all hover:bg-brand-soft/70 hover:border-primary/30 hover:text-primary`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-card text-primary shadow-xs">
                  <Users className="h-3.5 w-3.5" />
                </span>
                <span className="truncate font-semibold">Buku Tamu Depan</span>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            </Link>
          ))}

        {/* Profile Card & Logout */}
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div
              title={`Akun: ${userName || "Petugas"} (${userRoleDescription})`}
              className="flex shrink-0 items-center justify-center"
            >
              <Avatar name={userName || "Petugas"} size="sm" />
            </div>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                title="Keluar dari sesi admin"
                aria-label="Keluar dari sesi admin"
                className={`${focusRing} flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-destructive/30 bg-destructive/10 text-destructive transition-all hover:bg-destructive hover:text-destructive-foreground active:scale-90`}
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 rounded-2xl border border-border/70 bg-card p-2 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar name={userName || "Petugas"} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-foreground leading-tight">
                  {userName || (isAdmin ? "Administrator" : "Petugas Jaga")}
                </p>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1 leading-tight mt-0.5">
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${
                      isSecurityOnly
                        ? "bg-emerald-500"
                        : isStaffOnly
                          ? "bg-amber-500"
                          : "bg-primary"
                    }`}
                  />
                  {userRoleDescription}
                </p>
              </div>
            </div>

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                title="Keluar dari sesi admin"
                aria-label="Keluar"
                className={`${focusRing} flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-destructive/30 bg-destructive/10 text-destructive transition-all hover:bg-destructive hover:text-destructive-foreground active:scale-90`}
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
