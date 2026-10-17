import { Link, useLocation } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  BarChart3,
  BookOpen,
  Building2,
  ChevronDown,
  ChevronRight,
  Compass,
  ExternalLink,
  HelpCircle,
  Home,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Mail,
  Menu,
  MessageSquareHeart,
  QrCode,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import logo from "@/assets/logo.png";
import { Avatar } from "@/components/Avatar";

export type NavItem = {
  to: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  description?: string;
  category?: string;
};

interface SiteNavProps {
  items: NavItem[];
  right?: React.ReactNode;
  userName?: string;
  onLogout?: () => void;
  isDashboard?: boolean;
}

const ROUTE_METADATA: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    desc: string;
    category: "Menu Utama" | "Operasional & Data" | "Sistem & Akses" | "Informasi" | "Navigasi";
  }
> = {
  "/admin": {
    icon: LayoutDashboard,
    desc: "Ikhtisar statistik & metrik hari ini",
    category: "Menu Utama",
  },
  "/admin/tamu": {
    icon: Users,
    desc: "Kelola daftar hadir & check-in tamu",
    category: "Menu Utama",
  },
  "/admin/laporan": {
    icon: BarChart3,
    desc: "Grafik analitik & ekspor data",
    category: "Menu Utama",
  },
  "/admin/aktivitas": {
    icon: Activity,
    desc: "Jejak audit & riwayat operasional",
    category: "Menu Utama",
  },
  "/admin/karyawan": {
    icon: UserCheck,
    desc: "Direktori staf penerima tamu",
    category: "Operasional & Data",
  },
  "/admin/tujuan": {
    icon: Building2,
    desc: "Unit kerja, divisi & ruang meeting",
    category: "Operasional & Data",
  },
  "/admin/feedback": {
    icon: MessageSquareHeart,
    desc: "Evaluasi & indeks kepuasan tamu",
    category: "Operasional & Data",
  },
  "/admin/email-admin": {
    icon: Mail,
    desc: "Konfigurasi penerima notifikasi",
    category: "Sistem & Akses",
  },
  "/admin/pengguna": {
    icon: ShieldCheck,
    desc: "Pengaturan akun admin & akses",
    category: "Sistem & Akses",
  },
  "/admin/panduan": {
    icon: BookOpen,
    desc: "Dokumentasi & panduan teknis",
    category: "Sistem & Akses",
  },
  "#fitur": {
    icon: Sparkles,
    desc: "Keunggulan & fitur sistem",
    category: "Informasi",
  },
  "#alur": {
    icon: Compass,
    desc: "Alur pendaftaran & kunjungan",
    category: "Informasi",
  },
  "#faq": {
    icon: HelpCircle,
    desc: "Pertanyaan yang sering diajukan",
    category: "Informasi",
  },
  "/panduan": {
    icon: BookOpen,
    desc: "Buku petunjuk operasional",
    category: "Navigasi",
  },
  "/registrasi": {
    icon: Users,
    desc: "Pendaftaran tamu & buku tamu",
    category: "Navigasi",
  },
  "/admin/scan": {
    icon: QrCode,
    desc: "Pos verifikasi keamanan & pemindai pass",
    category: "Operasional & Data",
  },
  "/karyawan": {
    icon: UserCheck,
    desc: "Portal notifikasi staf",
    category: "Navigasi",
  },
  "/": {
    icon: Home,
    desc: "Halaman beranda utama",
    category: "Navigasi",
  },
};

export function SiteNav({ items, right, userName, onLogout, isDashboard }: SiteNavProps) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeAnchor, setActiveAnchor] = useState<string | null>(null);
  const pathname = useLocation().pathname;
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);

  const isDashboardMode =
    isDashboard !== undefined
      ? isDashboard
      : pathname.startsWith("/admin") && pathname !== "/admin/login";

  // Keyboard navigation & accessibility
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      const first = panelRef.current?.querySelector<HTMLElement>("a,button");
      first?.focus();
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setOpen(false);
          return;
        }
        if (e.key !== "Tab" || !panelRef.current) return;
        const els = [
          btnRef.current,
          ...panelRef.current.querySelectorAll<HTMLElement>("a,button"),
        ].filter(Boolean) as HTMLElement[];
        const i = els.indexOf(document.activeElement as HTMLElement);
        if (e.shiftKey && i <= 0) {
          e.preventDefault();
          els[els.length - 1]?.focus();
        } else if (!e.shiftKey && i === els.length - 1) {
          e.preventDefault();
          els[0]?.focus();
        }
      };
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    } else if (wasOpen.current) {
      wasOpen.current = false;
      btnRef.current?.focus();
    }
    return undefined;
  }, [open]);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Global trigger listener (e.g. from desktop header avatar)
  useEffect(() => {
    const handler = () => setOpen((prev) => !prev);
    window.addEventListener("toggle-sitenav-drawer", handler);
    return () => window.removeEventListener("toggle-sitenav-drawer", handler);
  }, []);

  // Scroll-spy for page anchors
  const anchors = useMemo(() => items.filter((l) => l.to.startsWith("#")), [items]);
  useEffect(() => {
    if (anchors.length === 0) return;
    const onScroll = () => {
      let current: string | null = null;
      if (window.scrollY >= 80) {
        for (const a of anchors) {
          const el = document.getElementById(a.to.slice(1));
          if (el && el.getBoundingClientRect().top <= 200) current = a.to;
        }
      }
      setActiveAnchor(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [anchors]);

  // Helper to check if an item is currently active
  const isItemActive = useCallback(
    (to: string) => {
      if (to.startsWith("#")) {
        return activeAnchor === to;
      }
      if (to === "/admin") {
        return pathname === "/admin";
      }
      return pathname === to || pathname.startsWith(to + "/");
    },
    [activeAnchor, pathname],
  );

  // Grouped items for the modern mobile & desktop drawer
  const groupedItems = useMemo(() => {
    const groups: Record<string, NavItem[]> = {};

    items.forEach((item) => {
      const meta = ROUTE_METADATA[item.to];
      const category =
        item.category || meta?.category || (isDashboardMode ? "Menu Utama" : "Navigasi");
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
    });

    return groups;
  }, [items, isDashboardMode]);

  // Check if current route is a secondary menu (outside the 4 bottom-nav core items)
  const isSecondaryMenuActive = useMemo(() => {
    if (!isDashboardMode) return false;
    const coreRoutes = ["/admin", "/admin/tamu", "/admin/laporan", "/admin/aktivitas"];
    return !coreRoutes.includes(pathname);
  }, [isDashboardMode, pathname]);

  // Primary 4 items shown directly in desktop navbar to keep layout uncluttered
  const primaryDesktopItems = useMemo(() => {
    if (!isDashboardMode || items.length <= 5) return items;
    const coreRoutes = ["/admin", "/admin/tamu", "/admin/laporan", "/admin/aktivitas"];
    const preferred = items.filter((it) => coreRoutes.includes(it.to));
    return preferred.length >= 3 ? preferred : items.slice(0, 4);
  }, [items, isDashboardMode]);

  const activeSecondaryItem = useMemo(() => {
    if (!isSecondaryMenuActive) return null;
    return items.find((it) => isItemActive(it.to));
  }, [isSecondaryMenuActive, items, isItemActive]);

  const focusRing =
    "outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";
  const linkBase =
    focusRing +
    " relative rounded-full px-4 py-2 text-sm font-medium transition-colors duration-300";
  const idleCls = "text-muted-foreground hover:bg-brand-soft hover:text-primary";
  const activeCls = "bg-brand-soft text-primary font-semibold";

  function desktopItem(l: NavItem) {
    if (l.to.startsWith("#")) {
      const active = activeAnchor === l.to;
      return (
        <a
          key={l.to}
          href={l.to}
          aria-current={active ? "location" : undefined}
          className={`${linkBase} ${active ? activeCls : idleCls}`}
        >
          {l.label}
          <span
            aria-hidden
            className={`absolute inset-x-4 -bottom-1 mx-auto h-1 rounded-full bg-primary transition-all duration-300 ${
              active ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0"
            }`}
          />
        </a>
      );
    }
    const active = activeAnchor === null && isItemActive(l.to);
    return (
      <Link
        key={l.to}
        to={l.to}
        aria-current={active ? "page" : undefined}
        className={`${linkBase} ${active ? activeCls : idleCls}`}
      >
        {l.label}
      </Link>
    );
  }

  // Modern native app card item for mobile sheet
  function renderMobileDrawerItem(l: NavItem, i: number) {
    const meta = ROUTE_METADATA[l.to];
    const IconComponent = l.icon || meta?.icon || Compass;
    const description = l.description || meta?.desc || "";
    const active = isItemActive(l.to);

    const content = (
      <>
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-200 ${
              active
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                : "bg-muted/80 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
            }`}
          >
            <IconComponent className="h-5 w-5" />
          </div>
          <div className="min-w-0 text-left">
            <div className="flex items-center gap-2">
              <span
                className={`truncate text-sm font-semibold transition-colors ${
                  active ? "text-primary font-bold" : "text-foreground group-hover:text-primary"
                }`}
              >
                {l.label}
              </span>
            </div>
            {description && (
              <p className="truncate text-xs text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {active ? (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
              Aktif
            </span>
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground/35 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
          )}
        </div>
      </>
    );

    const commonCls = `${focusRing} group flex w-full items-center justify-between gap-3 rounded-2xl border p-2.5 transition-all duration-200 active:scale-[0.98] ${
      active
        ? "border-primary/25 bg-brand-soft/80 shadow-xs"
        : "border-transparent bg-card/60 hover:border-border/60 hover:bg-muted/40"
    }`;

    if (l.to.startsWith("#")) {
      return (
        <a
          key={l.to}
          href={l.to}
          aria-current={active ? "location" : undefined}
          onClick={() => setOpen(false)}
          style={{ transitionDelay: `${Math.min(i * 25, 200)}ms` }}
          className={commonCls}
        >
          {content}
        </a>
      );
    }

    return (
      <Link
        key={l.to}
        to={l.to}
        aria-current={active ? "page" : undefined}
        onClick={() => setOpen(false)}
        style={{ transitionDelay: `${Math.min(i * 25, 200)}ms` }}
        className={commonCls}
      >
        {content}
      </Link>
    );
  }

  // Core items for the bottom floating dock
  const coreDashboardLinks = [
    { to: "/admin", label: "Ringkasan", icon: LayoutDashboard },
    { to: "/admin/tamu", label: "Tamu", icon: Users },
    { to: "/admin/scan", label: "Pindai Pass", icon: QrCode },
    { to: "/admin/laporan", label: "Laporan", icon: BarChart3 },
  ];

  const corePublicLinks = [
    { to: "/", label: "Beranda", icon: Home },
    { to: "/registrasi", label: "Registrasi", icon: Users },
    { to: "/panduan", label: "Panduan", icon: BookOpen },
    { to: "/karyawan", label: "Karyawan", icon: UserCheck },
  ];

  const bottomDockLinks = isDashboardMode ? coreDashboardLinks : corePublicLinks;

  const avatarName = userName || (isDashboardMode ? "Admin" : "Tamu");

  return (
    <>
      {/* Top Header Floating Capsule */}
      <header className="app-header sticky top-0 z-40 px-3 pt-3 md:px-6 md:pt-4">
        <a
          href="#konten"
          className="sr-only rounded-full bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
        >
          Lewati ke konten utama
        </a>
        <div
          className={`mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-full border px-4 py-2.5 transition-all duration-300 md:px-5 ${
            scrolled || isDashboardMode
              ? "border-border/70 bg-card/95 shadow-soft backdrop-blur-xl"
              : "border-transparent bg-card/50 backdrop-blur-md"
          }`}
        >
          <Link
            to="/"
            aria-label="Menara Nobu — Beranda"
            className={`${focusRing} rounded-full flex min-w-0 items-center gap-2.5`}
            onClick={() => setOpen(false)}
          >
            <img
              src={logo}
              alt="Nobu"
              className="h-7 w-auto shrink-0 transition-transform duration-300 hover:scale-105 md:h-8"
            />
            <div className="flex flex-col min-w-0">
              <span className="hidden truncate text-sm font-bold text-foreground sm:inline leading-none">
                Menara Nobu
              </span>
              {isDashboardMode && (
                <span className="hidden text-[10px] font-medium text-primary sm:inline leading-tight mt-0.5">
                  Dashboard
                </span>
              )}
            </div>
          </Link>

          <nav aria-label="Navigasi utama" className="hidden items-center gap-1 md:flex">
            {isDashboardMode && items.length > 5 ? (
              <>
                {primaryDesktopItems.map(desktopItem)}
                <button
                  type="button"
                  onClick={() => setOpen(!open)}
                  aria-expanded={open}
                  aria-label={open ? "Tutup drawer menu" : "Buka semua menu"}
                  className={`${focusRing} relative flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-all duration-200 active:scale-95 ${
                    open || isSecondaryMenuActive
                      ? "bg-brand-soft text-primary font-semibold shadow-xs"
                      : "text-muted-foreground hover:bg-brand-soft hover:text-primary"
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span>{activeSecondaryItem ? activeSecondaryItem.label : "Lainnya"}</span>
                  {isSecondaryMenuActive && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${
                      open ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </>
            ) : (
              items.map(desktopItem)
            )}
          </nav>

          <div className="hidden items-center gap-2 md:flex">{right}</div>

          {/* Mobile Right: Avatar instead of Hamburger button to eliminate double hamburger */}
          <div className="flex items-center gap-1.5 md:hidden">
            <button
              ref={btnRef}
              type="button"
              aria-controls="menu-ponsel-modern"
              aria-label={open ? "Tutup profil dan menu" : `Profil ${avatarName}`}
              aria-expanded={open}
              onClick={() => setOpen(!open)}
              className={`${focusRing} group relative flex items-center justify-center rounded-full border border-border/80 bg-card/90 p-1 transition-all active:scale-95 shadow-xs hover:border-primary/40 hover:bg-brand-soft/40`}
            >
              <Avatar name={avatarName} size="sm" />
              {isSecondaryMenuActive && (
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-primary" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Modern Native Mobile Floating Bottom Navigation Bar with rounded-full pill radius */}
      <aside
        aria-label="Navigasi cepat ponsel"
        className="fixed bottom-3.5 inset-x-3.5 z-40 mx-auto max-w-md md:hidden pointer-events-none"
      >
        <nav className="pointer-events-auto flex items-center justify-around gap-1 rounded-full border border-border/80 bg-card/95 p-1.5 shadow-[0_12px_32px_-4px_rgba(0,0,0,0.18)] backdrop-blur-xl">
          {bottomDockLinks.map((item) => {
            const active = isItemActive(item.to);
            const IconComp = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`${focusRing} relative flex flex-1 flex-col items-center justify-center rounded-full py-2 px-1 text-center transition-all duration-200 active:scale-95 ${
                  active
                    ? "bg-brand-soft text-primary font-bold shadow-xs"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                }`}
              >
                <IconComp className={`h-5 w-5 ${active ? "stroke-[2.25]" : "stroke-[1.75]"}`} />
                <span className="mt-0.5 text-[10px] leading-tight tracking-tight">
                  {item.label}
                </span>
                {active && (
                  <span aria-hidden className="absolute bottom-1 h-1 w-3 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}

          {/* Menu Button to toggle full floating drawer */}
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Tutup drawer menu" : "Buka semua menu"}
            aria-expanded={open}
            className={`${focusRing} relative flex flex-1 flex-col items-center justify-center rounded-full py-2 px-1 text-center transition-all duration-200 active:scale-95 ${
              open || isSecondaryMenuActive
                ? "bg-brand-soft text-primary font-bold shadow-xs"
                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            }`}
          >
            {open ? (
              <X className="h-5 w-5 stroke-[2.25]" />
            ) : (
              <Menu className="h-5 w-5 stroke-[1.75]" />
            )}
            <span className="mt-0.5 text-[10px] leading-tight tracking-tight">
              {open ? "Tutup" : "Menu"}
            </span>
            {(open || isSecondaryMenuActive) && (
              <span aria-hidden className="absolute bottom-1 h-1 w-3 rounded-full bg-primary" />
            )}
          </button>
        </nav>
      </aside>

      {/* Modern Native App Menu Drawer / Sheet (Mobile Bottom Sheet & Desktop Command Modal) */}
      <div
        className={`fixed inset-0 z-50 transition-all duration-300 ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!open}
      >
        {/* Soft backdrop blur overlay */}
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setOpen(false)}
        />

        {/* Floating Native App Card Container with generous rounded radius */}
        <div
          id="menu-ponsel-modern"
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Semua Menu Navigasi"
          className={`absolute inset-x-3.5 top-3.5 bottom-20 sm:bottom-auto sm:max-h-[85vh] max-w-lg md:max-w-xl mx-auto flex flex-col overflow-hidden rounded-3xl border border-border/80 bg-card/95 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)] backdrop-blur-2xl transition-all duration-300 ease-out md:top-20 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 ${
            open ? "translate-y-0 opacity-100 scale-100" : "-translate-y-4 opacity-0 scale-95"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Native Grab Handle Pill */}
          <div className="pt-2 pb-1 text-center shrink-0">
            <div className="mx-auto h-1.5 w-12 rounded-full bg-muted-foreground/20" />
          </div>

          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-border/50 px-4 py-2.5 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <img src={logo} alt="Nobu" className="h-6 w-auto shrink-0" />
              <div className="min-w-0">
                <span className="block truncate text-sm font-bold text-foreground leading-none">
                  Menara Nobu
                </span>
                <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {isDashboardMode ? "Dashboard Admin" : "Sistem Tamu"}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Tutup menu"
              className={`${focusRing} flex h-8 w-8 items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-90`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* User Profile Quick Card */}
          <div className="mx-4 mt-3 rounded-2xl border border-border/60 bg-muted/30 p-3 shrink-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar name={avatarName} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-foreground">
                    {userName || (isDashboardMode ? "Administrator" : "Pengunjung Menara Nobu")}
                  </p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                    {isDashboardMode ? "Admin Nobu" : "Tamu Digital"}
                  </p>
                </div>
              </div>

              {onLogout ? (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onLogout();
                  }}
                  className="inline-flex items-center gap-1 rounded-xl border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-xs font-semibold text-destructive transition-all hover:bg-destructive hover:text-destructive-foreground active:scale-95"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Keluar
                </button>
              ) : !isDashboardMode ? (
                <Link
                  to="/admin/login"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-1 rounded-xl border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary transition-all hover:bg-primary hover:text-primary-foreground active:scale-95"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Masuk
                </Link>
              ) : null}
            </div>
          </div>

          {/* Scrollable Categories & Navigation items */}
          <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-4">
            {Object.entries(groupedItems).map(([category, catItems], groupIdx) => (
              <div key={category} className="space-y-1.5">
                <div className="flex items-center justify-between px-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                    {category}
                  </span>
                  <span className="text-[10px] font-medium text-muted-foreground/50">
                    {catItems.length} menu
                  </span>
                </div>
                <div className="space-y-1">
                  {catItems.map((item, itemIdx) =>
                    renderMobileDrawerItem(item, groupIdx * 4 + itemIdx),
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Drawer Footer with Quick Shortcuts */}
          <div className="border-t border-border/60 bg-card/60 p-3 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <Link
                to="/registrasi"
                onClick={() => setOpen(false)}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border/70 bg-card px-3 py-2 text-xs font-semibold text-foreground transition-all hover:bg-brand-soft hover:text-primary active:scale-95"
              >
                <Users className="h-3.5 w-3.5 text-primary" />
                Buku Tamu Depan
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </Link>

              {onLogout && !isDashboardMode && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onLogout();
                  }}
                  className="inline-flex items-center justify-center gap-1 rounded-xl border border-destructive/30 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive hover:text-destructive-foreground active:scale-95"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Keluar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
