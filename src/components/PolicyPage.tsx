import { Link } from "@tanstack/react-router";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";

const nav = [
  { to: "/", label: "Beranda" },
  { to: "/registrasi", label: "Registrasi Tamu" },
  { to: "/privasi", label: "Privasi" },
  { to: "/cookies", label: "Cookie" },
];

export function PolicyPage({
  title,
  updated,
  sections,
  children,
}: {
  children?: React.ReactNode;
  title: string;
  updated: string;
  sections: { h: string; p: string[] }[];
}) {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav items={nav} />
      <main id="konten" tabIndex={-1} className="mx-auto max-w-3xl px-4 py-10 outline-none">
        <Link to="/" className="text-sm text-primary hover:underline">← Kembali</Link>
        <h1 className="mt-4 text-4xl text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Terakhir diperbarui: {updated}</p>
        <div className="mt-8 space-y-8 rounded-3xl border border-border bg-card p-6 md:p-8">
          {sections.map((s) => (
            <section key={s.h}>
              <h2 className="text-xl text-foreground">{s.h}</h2>
              {s.p.map((t, i) => (
                <p key={i} className="mt-2 leading-relaxed text-muted-foreground">{t}</p>
              ))}
            </section>
          ))}
        </div>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
