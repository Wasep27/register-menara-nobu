import { Link } from "@tanstack/react-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Compass, LayoutGrid, Menu, Plus, X } from "lucide-react";
import type { NavItem } from "./navTypes";

interface MobileBottomDockProps {
  leftDockItems: NavItem[];
  centerDockItem: NavItem;
  rightDockItems: NavItem[];
  isItemActive: (to: string) => boolean;
  isDashboardMode: boolean;
  open: boolean;
  onToggleMenu: () => void;
  isSecondaryMenuActive: boolean;
  focusRing: string;
}

export const MobileBottomDock = React.memo(function MobileBottomDock({
  leftDockItems,
  centerDockItem,
  rightDockItems,
  isItemActive,
  isDashboardMode,
  open,
  onToggleMenu,
  isSecondaryMenuActive,
  focusRing,
}: MobileBottomDockProps) {
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

  // SVG curved notch path calculation:
  // Concentric scoop cradle tailored precisely around the 48px circular button with harmonious clearance
  const notchPath = useMemo(() => {
    const w = barWidth;
    const h = 68;
    const r = 28; // original pill radius
    const cx = w / 2;

    // Harmonious, concentric curve around center button:
    // Mouth width = 80px (cx - 40 to cx + 40), depth = 40px, giving smooth, uniform 6px gap around 48px button
    return `M ${r} 0 H ${cx - 40} C ${cx - 28} 0, ${cx - 28} 24, ${cx - 18} 34 C ${cx - 10} 40, ${cx + 10} 40, ${cx + 18} 34 C ${cx + 28} 24, ${cx + 28} 0, ${cx + 40} 0 H ${w - r} A ${r} ${r} 0 0 1 ${w} ${r} V ${h - r} A ${r} ${r} 0 0 1 ${w - r} ${h} H ${r} A ${r} ${r} 0 0 1 0 ${h - r} V ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`;
  }, [barWidth]);

  const centerActive = isItemActive(centerDockItem.to);
  const CenterIcon = centerDockItem.icon || Plus;

  return (
    <aside
      aria-label="Navigasi cepat ponsel"
      className="fixed bottom-[max(0.85rem,env(safe-area-inset-bottom))] inset-x-3 z-40 mx-auto max-w-[430px] md:hidden pointer-events-none"
    >
      <div ref={barRef} className="pointer-events-auto relative w-full h-[68px]">
        {/* Custom Organic Curved-Notch SVG Background with original pill radius */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none drop-shadow-[0_12px_28px_rgba(0,0,0,0.15)] dark:drop-shadow-[0_14px_32px_rgba(0,0,0,0.5)]"
          width={barWidth}
          height={68}
          viewBox={`0 0 ${barWidth} 68`}
          fill="none"
        >
          <path
            d={notchPath}
            className="fill-card/95 dark:fill-card/95 stroke-border/80"
            strokeWidth="1.25"
          />
        </svg>

        {/* Central Protruding Floating Action Button (FAB) nestled comfortably with clear breathing room */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-[14px] z-20 flex flex-col items-center">
          <Link
            to={centerDockItem.to}
            onClick={() => {
              if (open) onToggleMenu();
            }}
            aria-label={centerDockItem.label}
            className={`${focusRing} group relative flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_20px_-3px_rgba(16,36,30,0.38)] dark:shadow-[0_8px_22px_-3px_rgba(16,185,129,0.42)] transition-all duration-200 active:scale-90 hover:brightness-110 ${
              centerActive ? "ring-3 ring-primary/30 scale-105" : ""
            }`}
          >
            <CenterIcon
              className={`h-5 w-5 ${
                isDashboardMode ? "stroke-[2.25]" : "stroke-[2.5]"
              } transition-transform group-hover:scale-110`}
            />
          </Link>
        </div>

        {/* 5-Column Grid: Flanking items on left & right of the center curved notch with consistent baseline */}
        <nav className="relative z-10 grid grid-cols-5 h-full items-center px-1">
          {/* Left 2 items */}
          {leftDockItems.map((item) => {
            const active = isItemActive(item.to);
            const IconComp = item.icon || Compass;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => {
                  if (open) onToggleMenu();
                }}
                className={`${focusRing} relative flex h-full flex-col items-center justify-end pb-2 text-center transition-all duration-200 active:scale-95`}
              >
                <div
                  className={`mb-1 flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                    active ? "bg-brand-soft shadow-2xs" : ""
                  }`}
                >
                  <IconComp className={`h-5 w-5 ${active ? "stroke-[2.25]" : "stroke-[1.75]"}`} />
                </div>
                <span
                  className={`text-[10px] leading-none tracking-tight ${
                    active
                      ? "text-primary font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </span>
                {active && <span aria-hidden className="mt-1 h-1 w-2.5 rounded-full bg-primary" />}
              </Link>
            );
          })}

          {/* Center Column: spacing under the protruding FAB button with label positioned clearly below notch */}
          <Link
            to={centerDockItem.to}
            onClick={() => {
              if (open) onToggleMenu();
            }}
            aria-label={centerDockItem.label}
            className={`${focusRing} relative flex h-full flex-col items-center justify-end pb-2 text-center transition-all duration-200 active:scale-95`}
          >
            <span
              className={`max-w-[72px] truncate text-[10px] font-bold tracking-tight text-center leading-none transition-colors ${
                centerActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {centerDockItem.label}
            </span>
            {centerActive && (
              <span aria-hidden className="mt-1 h-1 w-2.5 rounded-full bg-primary" />
            )}
          </Link>

          {/* Right Item 1 (e.g. Karyawan) */}
          {rightDockItems.map((item) => {
            const active = isItemActive(item.to);
            const IconComp = item.icon || Compass;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => {
                  if (open) onToggleMenu();
                }}
                className={`${focusRing} relative flex h-full flex-col items-center justify-end pb-2 text-center transition-all duration-200 active:scale-95`}
              >
                <div
                  className={`mb-1 flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                    active ? "bg-brand-soft shadow-2xs" : ""
                  }`}
                >
                  <IconComp className={`h-5 w-5 ${active ? "stroke-[2.25]" : "stroke-[1.75]"}`} />
                </div>
                <span
                  className={`text-[10px] leading-none tracking-tight ${
                    active
                      ? "text-primary font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </span>
                {active && <span aria-hidden className="mt-1 h-1 w-2.5 rounded-full bg-primary" />}
              </Link>
            );
          })}

          {/* Right Item 2: Menu Drawer Toggle Button */}
          <button
            type="button"
            onClick={onToggleMenu}
            aria-label={open ? "Tutup drawer menu" : "Buka semua menu"}
            aria-expanded={open}
            className={`${focusRing} relative flex h-full flex-col items-center justify-end pb-2 text-center transition-all duration-200 active:scale-95`}
          >
            <div
              className={`mb-1 flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
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
            <span
              className={`text-[10px] leading-none tracking-tight ${
                open || isSecondaryMenuActive
                  ? "text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {open ? "Tutup" : "Menu"}
            </span>
            {(open || isSecondaryMenuActive) && (
              <span aria-hidden className="mt-1 h-1 w-2.5 rounded-full bg-primary" />
            )}
          </button>
        </nav>
      </div>
    </aside>
  );
});
