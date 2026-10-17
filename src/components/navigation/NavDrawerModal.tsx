import { Link } from "@tanstack/react-router";
import React, { useEffect, useRef } from "react";
import {
  ChevronRight,
  Compass,
  ExternalLink,
  LogOut,
  QrCode,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import logo from "@/assets/logo.png";
import { Avatar } from "@/components/Avatar";
import type { NavItem } from "./navTypes";
import { ROUTE_METADATA } from "./routeMetadata";

interface NavDrawerModalProps {
  open: boolean;
  onClose: () => void;
  userName?: string;
  avatarName: string;
  isDashboardMode: boolean;
  hideRegistration?: boolean;
  onLogout?: () => void;
  groupedItems: Record<string, NavItem[]>;
  isItemActive: (to: string) => boolean;
  focusRing: string;
  triggerBtnRef?: React.RefObject<HTMLButtonElement | null>;
}

export const NavDrawerModal = React.memo(function NavDrawerModal({
  open,
  onClose,
  userName,
  avatarName,
  isDashboardMode,
  hideRegistration,
  onLogout,
  groupedItems,
  isItemActive,
  focusRing,
  triggerBtnRef,
}: NavDrawerModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);

  // Keyboard navigation & accessibility focus trapping
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      const first = panelRef.current?.querySelector<HTMLElement>("a,button");
      first?.focus();
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onClose();
          return;
        }
        if (e.key !== "Tab" || !panelRef.current) return;
        const els = [
          triggerBtnRef?.current,
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
      triggerBtnRef?.current?.focus();
    }
    return undefined;
  }, [open, onClose, triggerBtnRef]);

  // Lock body scroll when modal is active
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
    return undefined;
  }, [open]);

  // Modern native app card item for mobile sheet
  const renderMobileDrawerItem = (l: NavItem, i: number) => {
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
          onClick={onClose}
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
        onClick={onClose}
        style={{ transitionDelay: `${Math.min(i * 25, 200)}ms` }}
        className={commonCls}
      >
        {content}
      </Link>
    );
  };

  return (
    <div
      className={`fixed inset-0 z-50 transition-all duration-300 ${
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
      aria-hidden={!open}
    >
      {/* Soft backdrop blur overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
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
          <Link to="/" onClick={onClose} aria-label="Menara Nobu" className="flex items-center">
            <img src={logo} alt="Menara Nobu" className="h-7 w-auto shrink-0" />
          </Link>

          <button
            type="button"
            onClick={onClose}
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
                  onClose();
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
                onClick={onClose}
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
                onClick={onClose}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-primary/40 bg-brand-soft px-3 py-2 text-xs font-semibold text-primary transition-all hover:bg-primary hover:text-primary-foreground active:scale-95"
              >
                <QrCode className="h-3.5 w-3.5" />
                Pos Pindai Pass
              </Link>
            ) : (
              <Link
                to="/registrasi"
                onClick={onClose}
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
                  onClose();
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
  );
});
