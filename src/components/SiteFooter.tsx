import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  const cls =
    "rounded-md px-1 hover:text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary";
  return (
    <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
      <nav aria-label="Tautan kebijakan" className="mb-2 flex flex-wrap justify-center gap-4">
        <Link to="/" hash="faq" className={cls}>
          FAQ
        </Link>
        <Link to="/privasi" className={cls}>
          Kebijakan Privasi
        </Link>
        <Link to="/cookies" className={cls}>
          Kebijakan Cookie
        </Link>
      </nav>
      © {new Date().getFullYear()} Menara Nobu · Buku Tamu Digital
    </footer>
  );
}
