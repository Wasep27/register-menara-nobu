import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import logo from "@/assets/logo.webp.asset.json";

export type NavItem = { to: string; label: string };

export function SiteNav({ items, right }: { items: NavItem[]; right?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  return (
    <header className={`app-header sticky top-0 z-40 transition-all duration-300 ${scrolled ? "bg-card/85 shadow-soft backdrop-blur-md" : "bg-transparent"}`}>
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 md:flex md:justify-between">
        <Link to="/" className="flex min-w-0 items-center gap-2" onClick={() => setOpen(false)}>
          <img src={logo.url} alt="Nobu" className="h-7 w-auto shrink-0 transition-transform duration-300 hover:scale-105 md:h-8" />
          <span className="hidden truncate text-sm font-medium text-muted-foreground sm:inline">Menara Nobu</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {items.map((l) => (
            <Link key={l.to} to={l.to} activeOptions={{ exact: true }}
              className="relative rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-brand-soft hover:text-primary"
              activeProps={{ className: "bg-brand-soft text-primary" }}>
              {l.label}
            </Link>
          ))}
          {right}
        </nav>

        <button aria-label={open ? "Tutup menu" : "Buka menu"} onClick={() => setOpen(!open)}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft text-primary transition-transform active:scale-90 md:hidden">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* menu ponsel */}
      <div className={`fixed inset-0 top-[68px] z-30 md:hidden ${open ? "pointer-events-auto" : "pointer-events-none"}`}>
        <div onClick={() => setOpen(false)} className={`absolute inset-0 bg-foreground/30 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`} />
        <div className={`absolute inset-x-3 top-2 rounded-2xl bg-card p-3 shadow-soft transition-all duration-300 ease-out ${open ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"}`}>
          {items.map((l, i) => (
            <Link key={l.to} to={l.to} activeOptions={{ exact: true }} onClick={() => setOpen(false)}
              style={{ transitionDelay: open ? `${i * 40}ms` : "0ms" }}
              className={`flex min-h-12 items-center rounded-xl px-4 text-base font-medium text-foreground transition-all duration-300 hover:bg-brand-soft ${open ? "translate-x-0 opacity-100" : "-translate-x-3 opacity-0"}`}
              activeProps={{ className: "bg-brand-soft text-primary" }}>
              {l.label}
            </Link>
          ))}
          {right && <div className="mt-2 border-t border-border pt-2" onClick={() => setOpen(false)}>{right}</div>}
        </div>
      </div>
    </header>
  );
}
