import { Toaster } from "@/components/ui/sonner";
import logo from "@/assets/logo.png";
import gedung from "@/assets/gedung-nobu.jpg.asset.json";
import { CookieBanner } from "@/components/CookieBanner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-foreground px-4 py-12">
      <img src={gedung.url} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-60" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-foreground via-foreground/60 to-transparent" />
      <div className="fade-up relative w-full max-w-md rounded-[2rem] border border-border/40 bg-card/90 p-8 text-center shadow-soft backdrop-blur-md">
        <img src={logo} alt="Nobu" className="mx-auto h-8 w-auto" />
        <p className="mt-6 font-display text-7xl font-black text-primary">404</p>
        <h1 className="mt-2 text-2xl text-foreground">Halaman tidak ditemukan</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sepertinya Anda salah lantai. Halaman yang dicari tidak ada atau sudah dipindahkan.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Link to="/registrasi" className="inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-6 font-display font-bold text-primary-foreground transition-all hover:brightness-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
            Isi Registrasi Tamu
          </Link>
          <Link to="/" className="inline-flex min-h-12 items-center justify-center rounded-full border border-border bg-card px-6 font-medium text-foreground transition-colors hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </main>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Buku Tamu Menara Nobu" },
      { name: "description", content: "Registrasi tamu digital Menara Nobu" },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "Buku Tamu Menara Nobu" },
      { property: "og:description", content: "Registrasi tamu digital Menara Nobu" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <CookieBanner />
      <Toaster position="top-center" richColors closeButton />
    </QueryClientProvider>
  );
}
