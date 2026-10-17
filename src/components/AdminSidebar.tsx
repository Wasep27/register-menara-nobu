import { Link, useLocation } from "@tanstack/react-router";
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
  QrCode,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import logo from "@/assets/logo.png";
import { Avatar } from "@/components/Avatar";

export interface AdminSidebarProps {
  userName?: string;
  onLogout?: () => void;
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

const NAV_GROUPS: NavGroup[] = [
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
      {
        to: "/admin/scan",
        label: "Pindai QR / Pass",
        icon: QrCode,
        description: "Verifikasi badge & pos sekuriti",
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

export function AdminSidebar({ userName, onLogout }: AdminSidebarProps) {
  const pathname = useLocation().pathname;

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
      className="hidden md:flex flex-col w-64 lg:w-72 shrink-0 sticky top-4 h-[calc(100vh-2rem)] rounded-3xl border border-border/80 bg-card/90 shadow-soft backdrop-blur-xl p-4 overflow-hidden z-30 select-none"
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between pb-3.5 mb-2 border-b border-border/60 shrink-0">
        <Link
          to="/admin"
          className={`${focusRing} flex items-center gap-3 rounded-2xl group transition-all`}
        >
          <img
            src={logo}
            alt="Menara Nobu"
            className="h-8 w-auto shrink-0 transition-transform duration-300 group-hover:scale-105"
          />
          <div className="min-w-0">
            <span className="block truncate font-display text-sm font-bold text-foreground tracking-tight leading-none">
              Menara Nobu
            </span>
            <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-bold text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Admin Portal
            </span>
          </div>
        </Link>
      </div>

      {/* Nav List with Slim Custom Scrollbar */}
      <nav
        aria-label="Menu navigasi sidebar"
        className="flex-1 overflow-y-auto overflow-x-hidden space-y-4 pr-1 -mr-1 text-left"
      >
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="space-y-1">
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
              {group.title}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isItemActive(item.to);
                const IconComponent = item.icon;
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
      <div className="pt-3 mt-2 border-t border-border/60 shrink-0 space-y-2.5">
        {/* Link to public front registration */}
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

        {/* Profile Card & Logout */}
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-border/70 bg-card p-2 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar name={userName || "Admin"} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-foreground leading-tight">
                {userName || "Administrator"}
              </p>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1 leading-tight mt-0.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                Admin Menara Nobu
              </p>
            </div>
          </div>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              title="Keluar dari sesi admin"
              className={`${focusRing} flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-destructive/30 bg-destructive/10 text-destructive transition-all hover:bg-destructive hover:text-destructive-foreground active:scale-90`}
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
