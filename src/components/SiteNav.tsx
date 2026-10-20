import { Link, useLocation } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import logo from "@/assets/logo.png";
import { Avatar } from "@/components/Avatar";
import type { NavItem, SiteNavProps } from "./navigation/navTypes";
import { ROUTE_METADATA } from "./navigation/routeMetadata";
import { MobileBottomDock } from "./navigation/MobileBottomDock";
import { NavDrawerModal } from "./navigation/NavDrawerModal";
import {
  LayoutDashboard,
  Users,
  QrCode,
  UserCheck,
  BarChart3,
  Home,
  BookOpen,
  Plus,
} from "lucide-react";
import { PWAInstallButton } from "@/components/PWAInstallButton";

export type { NavItem, SiteNavProps };

export function SiteNav({
  items,
  right,
  userName,
  userAvatar,
  onLogout,
  onOpenProfile,
  isDashboard,
  hideRegistration,
}: SiteNavProps) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeAnchor, setActiveAnchor] = useState<string | null>(null);
  const pathname = useLocation().pathname;
  const btnRef = useRef<HTMLButtonElement>(null);

  const isDashboardMode =
    isDashboard !== undefined
      ? isDashboard
      : pathname.startsWith("/admin") && pathname !== "/admin/login";

  // Global trigger listener (e.g. from desktop header avatar)
  useEffect(() => {
    const handler = () => setOpen((prev) => !prev);
    window.addEventListener("toggle-sitenav-drawer", handler);
    return () => window.removeEventListener("toggle-sitenav-drawer", handler);
  }, []);

  // Optimized high-performance scroll listener with requestAnimationFrame to prevent layout thrashing
  const anchors = useMemo(() => items.filter((l) => l.to.startsWith("#")), [items]);
  useEffect(() => {
    let ticking = false;

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const isScrolled = window.scrollY > 8;
          setScrolled(isScrolled);

          if (anchors.length > 0) {
            let current: string | null = null;
            if (window.scrollY >= 80) {
              for (const a of anchors) {
                const el = document.getElementById(a.to.slice(1));
                if (el && el.getBoundingClientRect().top <= 200) current = a.to;
              }
            }
            setActiveAnchor(current);
          }

          ticking = false;
        });
        ticking = true;
      }
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
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

  // Check if current route is directly represented in the bottom dock items
  const isRouteInMobileDock = useMemo(() => {
    const dockRoutes = [
      ...leftDockItems.map((i) => i.to),
      centerDockItem.to,
      ...rightDockItems.map((i) => i.to),
    ];
    return dockRoutes.some((route) => isItemActive(route));
  }, [leftDockItems, centerDockItem, rightDockItems, isItemActive]);

  // Check if current route is a secondary menu (outside the visible bottom-nav dock items)
  const isSecondaryMenuActive = useMemo(() => {
    if (!isDashboardMode) return false;
    return !isRouteInMobileDock;
  }, [isDashboardMode, isRouteInMobileDock]);

  // For public desktop navbar: cleanly separate content navigation from actions (Registrasi CTA & Admin link)
  const { publicContentItems, publicCtaItem, publicAdminItem } = useMemo(() => {
    if (isDashboardMode) {
      return { publicContentItems: items, publicCtaItem: null, publicAdminItem: null };
    }

    const content: NavItem[] = [];
    let cta: NavItem | null = null;
    let admin: NavItem | null = null;

    for (const it of items) {
      const isReg = it.to === "/registrasi" || it.label.toLowerCase().includes("registrasi");
      const isAdmin = it.to.startsWith("/admin") || it.label.toLowerCase() === "admin";

      if (isReg && !cta) {
        cta = it;
      } else if (isAdmin && !admin) {
        admin = it;
      } else {
        content.push(it);
      }
    }

    return { publicContentItems: content, publicCtaItem: cta, publicAdminItem: admin };
  }, [isDashboardMode, items]);

  const focusRing =
    "outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";
  const linkBase =
    focusRing +
    " relative rounded-full px-3 py-1.5 lg:px-3.5 text-sm font-medium transition-colors duration-200";
  const idleCls = "text-muted-foreground hover:bg-brand-soft hover:text-primary";
  const activeCls = "bg-brand-soft text-primary font-semibold shadow-2xs";

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
          className={`mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-full border px-4 py-2 transition-all duration-300 md:px-5 ${
            scrolled || isDashboardMode
              ? "border-border/70 bg-card/95 shadow-soft backdrop-blur-xl"
              : "border-border/40 bg-card/85 shadow-xs backdrop-blur-md"
          }`}
        >
          {/* Logo brand */}
          <Link
            to={isDashboardMode ? "/admin" : "/"}
            className={`${focusRing} flex items-center rounded-full`}
            aria-label="Menara Nobu Beranda"
          >
            <img
              src={logo}
              alt="Menara Nobu"
              className="h-7 w-auto shrink-0 transition-transform duration-300 hover:scale-105 md:h-8"
            />
            {isDashboardMode && (
              <span className="hidden ml-2 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full sm:inline leading-none">
                Dashboard
              </span>
            )}
          </Link>

          {/* Desktop Navigation: neatly structured, spacious, and never cramped */}
          <nav aria-label="Navigasi utama" className="hidden items-center gap-1 lg:gap-1.5 md:flex">
            {isDashboardMode ? items.map(desktopItem) : publicContentItems.map(desktopItem)}
          </nav>

          {/* Desktop Right Actions: Admin and Primary Registration CTA */}
          <div className="hidden items-center gap-2 lg:gap-2.5 md:flex">
            <PWAInstallButton variant="badge" />
            {right ? (
              right
            ) : !isDashboardMode ? (
              <>
                {publicAdminItem && (
                  <Link
                    to={publicAdminItem.to}
                    className={`${focusRing} rounded-full border border-border/80 px-3.5 py-1.5 text-xs font-semibold text-muted-foreground transition-all duration-200 hover:border-primary/40 hover:bg-brand-soft hover:text-primary active:scale-95`}
                  >
                    {publicAdminItem.label}
                  </Link>
                )}
                {publicCtaItem && (
                  <Link
                    to={publicCtaItem.to}
                    className={`${focusRing} inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs transition-all duration-200 hover:brightness-110 active:scale-95`}
                  >
                    <span>{publicCtaItem.label}</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </>
            ) : null}
          </div>

          {/* Mobile Right: Full radius circular Avatar button */}
          <div className="flex items-center gap-1.5 md:hidden">
            <button
              ref={btnRef}
              type="button"
              aria-controls="menu-ponsel-modern"
              aria-label={open ? "Tutup profil dan menu" : `Profil ${avatarName}`}
              aria-expanded={open}
              onClick={() => setOpen(!open)}
              className={`${focusRing} group relative flex items-center justify-center rounded-full border border-border/80 bg-card p-0.5 transition-all duration-200 active:scale-95 shadow-2xs hover:border-primary/50 hover:shadow-xs`}
            >
              <Avatar name={avatarName} src={userAvatar} size="sm" />
              {isSecondaryMenuActive && (
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-primary" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Modern Curved-Notch Mobile Floating Bottom Navigation Bar (Scooped Center FAB Style) */}
      <MobileBottomDock
        leftDockItems={leftDockItems}
        centerDockItem={centerDockItem}
        rightDockItems={rightDockItems}
        isItemActive={isItemActive}
        isDashboardMode={isDashboardMode}
        open={open}
        onToggleMenu={() => setOpen(!open)}
        isSecondaryMenuActive={isSecondaryMenuActive}
        focusRing={focusRing}
      />

      {/* Modern Native App Menu Drawer / Sheet (Mobile Bottom Sheet & Desktop Command Modal) */}
      <NavDrawerModal
        open={open}
        onClose={() => setOpen(false)}
        userName={userName}
        userAvatar={userAvatar}
        avatarName={avatarName}
        isDashboardMode={isDashboardMode}
        hideRegistration={hideRegistration}
        onLogout={onLogout}
        onOpenProfile={onOpenProfile}
        groupedItems={groupedItems}
        isItemActive={isItemActive}
        focusRing={focusRing}
        triggerBtnRef={btnRef}
      />
    </>
  );
}
