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
  Plus,
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
  hideRegistration?: boolean;
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

const CORE_PUBLIC_LINKS = [
  { to: "/", label: "Beranda", icon: Home },
  { to: "/registrasi", label: "Registrasi", icon: Users },
  { to: "/panduan", label: "Panduan", icon: BookOpen },
  { to: "/karyawan", label: "Karyawan", icon: UserCheck },
];

export function SiteNav({
  items,
  right,
  userName,
  onLogout,
  isDashboard,
  hideRegistration,
}: SiteNavProps) {
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

  // Resize observer to ensure the curved notch SVG is always pixel-perfect on any mobile screen width
  const [barWidth, setBarWidth] = useState(380);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!barRef.current) return;
    const updateWidth = () => {
      if (barRef.current) {
        const w = barRef.current.offsetWidth;
        if (w > 0) setBarWidth(w);
      }
    };
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    ro.observe(barRef.current);
    window.addEventListener("resize", updateWidth);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateWidth);
    };
  }, []);

  // Split mobile bottom dock items: Left 2 items, Center protruding item, Right items + Menu button
  const { leftDockItems, centerDockItem, rightDockItems } = useMemo(() => {
    if (!isDashboardMode) {
      return {
        leftDockItems: [
          { to: "/", label: "Beranda", icon: Home },
          { to: "/panduan", label: "Panduan", icon: BookOpen },
        ],
        centerDockItem: {
          to: "/registrasi",
          label: "Registrasi",
          icon: Plus,
        },
        rightDockItems: [{ to: "/karyawan", label: "Karyawan", icon: UserCheck }],
      };
    }

    const permittedRoutes = new Set(items.map((it) => it.to));

    // Dashboard navigation:
    const leftCandidates = [
      { to: "/admin", label: "Ringkasan", icon: LayoutDashboard },
      { to: "/admin/tamu", label: "Tamu", icon: Users },
    ];
    const center = {
      to: "/admin/scan",
      label: "Pindai",
      icon: QrCode,
    };
    const right = permittedRoutes.has("/admin/karyawan")
      ? { to: "/admin/karyawan", label: "Karyawan", icon: UserCheck }
      : permittedRoutes.has("/admin/laporan")
        ? { to: "/admin/laporan", label: "Laporan", icon: BarChart3 }
        : { to: "/admin/tamu", label: "Tamu", icon: Users };

    const validLeft = leftCandidates.filter((c) => permittedRoutes.has(c.to));

    return {
      leftDockItems:
        validLeft.length >= 2
          ? leftCandidates
          : [
              { to: "/admin/tamu", label: "Tamu", icon: Users },
              { to: "/admin/karyawan", label: "Karyawan", icon: UserCheck },
            ],
      centerDockItem: center,
      rightDockItems: [right],
    };
  }, [isDashboardMode, items]);

  // SVG curved notch path calculation:
  // Smooth organic scoop curve in the center for the protruding FAB button
  const notchPath = useMemo(() => {
    const w = barWidth;
    const h = 64;
    const r = 28; // full radius on pill ends
    const cx = w / 2;

    // Organic scoop curve around the center circle:
    // Shoulder starts at cx - 44, dips smoothly to depth 39, and rises back to cx + 44
    return `M ${r} 0 L ${cx - 44} 0 C ${cx - 30} 0, ${cx - 32} 20, ${cx - 22} 30 C ${cx - 12} 39, ${cx + 12} 39, ${cx + 22} 30 C ${cx + 32} 20, ${cx + 30} 0, ${cx + 44} 0 L ${w - r} 0 A ${r} ${r} 0 0 1 ${w} ${r} L ${w} ${h - r} A ${r} ${r} 0 0 1 ${w - r} ${h} L ${r} ${h} A ${r} ${r} 0 0 1 0 ${h - r} L 0 ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`;
  }, [barWidth]);

  const centerActive = isItemActive(centerDockItem.to);
  const CenterIcon = centerDockItem.icon || Plus;

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

      {/* Modern Curved-Notch Mobile Floating Bottom Navigation Bar (Scooped Center FAB Style) */}
      <aside
        aria-label="Navigasi cepat ponsel"
        className="fixed bottom-[max(0.85rem,env(safe-area-inset-bottom))] inset-x-3 z-40 mx-auto max-w-[430px] md:hidden pointer-events-none"
      >
        <div ref={barRef} className="pointer-events-auto relative w-full h-[64px]">
          {/* Custom Organic Curved-Notch SVG Background */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none drop-shadow-[0_12px_28px_rgba(0,0,0,0.15)] dark:drop-shadow-[0_14px_32px_rgba(0,0,0,0.5)]"
            width={barWidth}
            height={64}
            viewBox={`0 0 ${barWidth} 64`}
            fill="none"
          >
            <path
              d={notchPath}
              className="fill-card/95 dark:fill-card/95 stroke-border/80"
              strokeWidth="1.25"
            />
          </svg>

          {/* Central Protruding Floating Action Button (FAB) nestled in the curved notch */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-5 z-20 flex flex-col items-center">
            <Link
              to={centerDockItem.to}
              onClick={() => setOpen(false)}
              aria-label={centerDockItem.label}
              className={`${focusRing} group relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_10px_24px_-4px_rgba(16,36,30,0.4)] dark:shadow-[0_10px_28px_-4px_rgba(16,185,129,0.45)] transition-all duration-200 active:scale-90 hover:brightness-110 ${
                centerActive ? "ring-4 ring-primary/25 scale-105" : ""
              }`}
            >
              <CenterIcon
                className={`h-6 w-6 ${
                  isDashboardMode ? "stroke-[2.25]" : "stroke-[2.5]"
                } transition-transform group-hover:scale-110`}
              />
            </Link>
          </div>

          {/* 5-Column Grid: Flanking items on left & right of the center curved notch */}
          <nav className="relative z-10 grid grid-cols-5 h-full items-center px-1">
            {/* Left 2 items */}
            {leftDockItems.map((item) => {
              const active = isItemActive(item.to);
              const IconComp = item.icon || Compass;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={`${focusRing} relative flex flex-col items-center justify-center py-1.5 px-0.5 text-center transition-all duration-200 active:scale-95 ${
                    active
                      ? "text-primary font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                      active ? "bg-brand-soft shadow-2xs" : ""
                    }`}
                  >
                    <IconComp className={`h-5 w-5 ${active ? "stroke-[2.25]" : "stroke-[1.75]"}`} />
                  </div>
                  <span className="mt-0.5 text-[10px] leading-tight tracking-tight">
                    {item.label}
                  </span>
                  {active && (
                    <span
                      aria-hidden
                      className="absolute bottom-1 h-1 w-2.5 rounded-full bg-primary"
                    />
                  )}
                </Link>
              );
            })}

            {/* Center Column: spacing under the protruding FAB button with label */}
            <div className="flex flex-col items-center justify-end pb-1.5 pointer-events-none">
              <span
                className={`text-[9.5px] font-bold tracking-tight leading-tight transition-colors ${
                  centerActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {centerDockItem.label}
              </span>
              {centerActive && (
                <span aria-hidden className="mt-0.5 h-1 w-2.5 rounded-full bg-primary" />
              )}
            </div>

            {/* Right Item 1 (e.g. Karyawan) */}
            {rightDockItems.map((item) => {
              const active = isItemActive(item.to);
              const IconComp = item.icon || Compass;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={`${focusRing} relative flex flex-col items-center justify-center py-1.5 px-0.5 text-center transition-all duration-200 active:scale-95 ${
                    active
                      ? "text-primary font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                      active ? "bg-brand-soft shadow-2xs" : ""
                    }`}
                  >
                    <IconComp className={`h-5 w-5 ${active ? "stroke-[2.25]" : "stroke-[1.75]"}`} />
                  </div>
                  <span className="mt-0.5 text-[10px] leading-tight tracking-tight">
                    {item.label}
                  </span>
                  {active && (
                    <span
                      aria-hidden
                      className="absolute bottom-1 h-1 w-2.5 rounded-full bg-primary"
                    />
                  )}
                </Link>
              );
            })}

            {/* Right Item 2: Menu Drawer Toggle Button */}
            <button
              type="button"
              onClick={() => setOpen(!open)}
              aria-label={open ? "Tutup drawer menu" : "Buka semua menu"}
              aria-expanded={open}
              className={`${focusRing} relative flex flex-col items-center justify-center py-1.5 px-0.5 text-center transition-all duration-200 active:scale-95 ${
                open || isSecondaryMenuActive
                  ? "text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                  open || isSecondaryMenuActive ? "bg-brand-soft shadow-2xs" : ""
                }`}
              >
                {open ? (
                  <X className="h-5 w-5 stroke-[2.25]" />
                ) : isDashboardMode ? (
                  <LayoutGrid className="h-5 w-5 stroke-[1.75]" />
                ) : (
                  <Menu className="h-5 w-5 stroke-[1.75]" />
                )}
              </div>
              <span className="mt-0.5 text-[10px] leading-tight tracking-tight">
                {open ? "Tutup" : "Menu"}
              </span>
              {(open || isSecondaryMenuActive) && (
                <span aria-hidden className="absolute bottom-1 h-1 w-2.5 rounded-full bg-primary" />
              )}
            </button>
          </nav>
        </div>
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
            <Link
              to="/"
              onClick={() => setOpen(false)}
              aria-label="Menara Nobu"
              className="flex items-center"
            >
              <img src={logo} alt="Menara Nobu" className="h-7 w-auto shrink-0" />
            </Link>

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
              {hideRegistration ? (
                <Link
                  to="/admin/scan"
                  onClick={() => setOpen(false)}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-primary/40 bg-brand-soft px-3 py-2 text-xs font-semibold text-primary transition-all hover:bg-primary hover:text-primary-foreground active:scale-95"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  Pos Pindai Pass
                </Link>
              ) : (
                <Link
                  to="/registrasi"
                  onClick={() => setOpen(false)}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border/70 bg-card px-3 py-2 text-xs font-semibold text-foreground transition-all hover:bg-brand-soft hover:text-primary active:scale-95"
                >
                  <Users className="h-3.5 w-3.5 text-primary" />
                  Buku Tamu Depan
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </Link>
              )}

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
