import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Cookie } from "lucide-react";
import { EVENT, readConsent, saveConsent } from "@/lib/consent";

const btn =
  "min-h-11 rounded-full px-5 text-sm font-semibold transition-all active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

export function CookieBanner() {
  const [show, setShow] = useState(false);
  const path = useLocation().pathname;

  useEffect(() => {
    const sync = () => setShow(!readConsent()?.decided);
    sync();
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);

  if (!show || path === "/cookies") return null;

  return (
    <div
      role="region"
      aria-label="Persetujuan cookie"
      className="fade-up fixed inset-x-3 bottom-3 z-50 mx-auto max-w-2xl rounded-3xl border border-border bg-card p-5 shadow-soft md:bottom-5"
    >
      <div className="flex gap-3">
        <Cookie aria-hidden className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
        <div>
          <h2 className="text-base font-bold text-foreground">Kami menghargai privasi Anda</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Kami memakai penyimpanan yang diperlukan agar formulir dan login berfungsi. Penyimpanan tambahan hanya dipakai jika Anda setuju.{" "}
            <Link to="/cookies" className="font-medium text-primary underline">Kebijakan Cookie</Link>
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link to="/cookies" hash="pengaturan" className={`${btn} inline-flex items-center justify-center text-primary hover:bg-brand-soft`}>
          Atur preferensi
        </Link>
        <button type="button" onClick={() => saveConsent({ preferences: false, analytics: false })} className={`${btn} border border-border bg-card text-foreground hover:bg-brand-soft`}>
          Tolak
        </button>
        <button type="button" onClick={() => saveConsent({ preferences: true, analytics: true })} className={`${btn} bg-primary text-primary-foreground hover:brightness-110`}>
          Terima semua
        </button>
      </div>
    </div>
  );
}
