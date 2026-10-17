import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import logo from "@/assets/logo.png";

export type NavItem = { to: string; label: string };

export function SiteNav({ items, right }: { items: NavItem[]; right?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeAnchor, setActiveAnchor] = useState<string | null>(null);
  const pathname = useLocation().pathname;
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);

  // Keyboard: Esc menutup, Tab terkunci di dalam menu, fokus dikembalikan ke tombol
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

  // Scroll-spy: tandai tautan bagian halaman yang sedang terlihat
  const anchors = items.filter((l) => l.to.startsWith("#"));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const focusRing =
    "outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";
  const linkBase =
    focusRing +
    " relative rounded-full px-4 py-2 text-sm font-medium transition-colors duration-300";
  const idleCls = "text-muted-foreground hover:bg-brand-soft hover:text-primary";
  const activeCls = "bg-brand-soft text-primary";

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
    const active = activeAnchor === null && pathname === l.to;
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

  function mobileItem(l: NavItem, i: number) {
    const motion = open ? "translate-x-0 opacity-100" : "-translate-x-3 opacity-0";
    if (l.to.startsWith("#")) {
      const active = activeAnchor === l.to;
      return (
        <a
          key={l.to}
          href={l.to}
          aria-current={active ? "location" : undefined}
          onClick={() => setOpen(false)}
          style={{ transitionDelay: open ? `${i * 40}ms` : "0ms" }}
          className={`${focusRing} flex min-h-12 items-center rounded-xl px-4 text-base font-medium transition-all duration-300 hover:bg-brand-soft ${
            active ? "bg-brand-soft text-primary" : "text-foreground"
          } ${motion}`}
        >
          {l.label}
        </a>
      );
    }
    const active = activeAnchor === null && pathname === l.to;
    return (
      <Link
        key={l.to}
        to={l.to}
        aria-current={active ? "page" : undefined}
        onClick={() => setOpen(false)}
        style={{ transitionDelay: open ? `${i * 40}ms` : "0ms" }}
        className={`${focusRing} flex min-h-12 items-center rounded-xl px-4 text-base font-medium transition-all duration-300 hover:bg-brand-soft ${
          active ? "bg-brand-soft text-primary" : "text-foreground"
        } ${motion}`}
      >
        {l.label}
      </Link>
    );
  }

  return (
    <header className="app-header sticky top-0 z-40 px-3 pt-3 md:px-6 md:pt-4">
      <a
        href="#konten"
        className="sr-only rounded-full bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
      >
        Lewati ke konten utama
      </a>
      {/* kapsul melayang */}
      <div
        className={`mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-full border px-4 py-2.5 transition-all duration-300 md:px-5 ${
          scrolled
            ? "border-border/50 bg-card/85 shadow-soft backdrop-blur-md"
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
          <span className="hidden truncate text-sm font-semibold text-foreground sm:inline">
            Menara Nobu
          </span>
        </Link>

        <nav aria-label="Navigasi utama" className="hidden items-center gap-1 md:flex">
          {items.map(desktopItem)}
        </nav>

        <button
          ref={btnRef}
          type="button"
          aria-controls="menu-ponsel"
          aria-label={open ? "Tutup menu" : "Buka menu"}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className={`${focusRing} flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-all active:scale-90 md:hidden ${
            open
              ? "border-transparent bg-primary text-primary-foreground"
              : "border-border bg-card text-primary hover:bg-brand-soft"
          }`}
        >
          {open ? <X aria-hidden className="h-5 w-5" /> : <Menu aria-hidden className="h-5 w-5" />}
        </button>
      </div>

      {/* menu ponsel — tanpa latar gelap, panel mengapung */}
      <div
        className={`fixed inset-0 top-[84px] z-30 md:hidden ${open ? "pointer-events-auto" : "pointer-events-none"}`}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
        inert={!open}
      >
        <nav
          id="menu-ponsel"
          ref={panelRef as React.RefObject<HTMLElement & HTMLDivElement>}
          aria-label="Menu navigasi ponsel"
          className={`absolute inset-x-3 top-2 rounded-3xl border border-border/60 bg-card p-3 shadow-soft transition-all duration-300 ease-out ${
            open ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"
          }`}
        >
          <div onClick={(e) => e.stopPropagation()}>{items.map(mobileItem)}</div>
          {right && (
            <div className="mt-2 border-t border-border pt-2" onClick={() => setOpen(false)}>
              {right}
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
