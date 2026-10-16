import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { readConsent, saveConsent } from "@/lib/consent";

export function CookieSettings() {
  const [pref, setPref] = useState(false);
  const [ana, setAna] = useState(false);
  const [saved, setSaved] = useState("");

  useEffect(() => {
    const c = readConsent();
    if (c) { setPref(c.preferences); setAna(c.analytics); }
  }, []);

  function save(p: boolean, a: boolean) {
    setPref(p); setAna(a);
    saveConsent({ preferences: p, analytics: a });
    setSaved("Preferensi cookie tersimpan.");
    toast?.success?.("Preferensi cookie tersimpan");
  }

  const rows = [
    { id: "c-nec", t: "Diperlukan", d: "Draf formulir dan sesi login. Selalu aktif.", v: true, set: undefined },
    { id: "c-pref", t: "Preferensi", d: "Mengingat pilihan tampilan Anda.", v: pref, set: setPref },
    { id: "c-ana", t: "Analitik", d: "Statistik anonim untuk memperbaiki layanan.", v: ana, set: setAna },
  ];

  return (
    <section id="pengaturan" aria-labelledby="pengaturan-judul" className="mt-8 scroll-mt-24 rounded-3xl border border-border bg-card p-6 md:p-8">
      <h2 id="pengaturan-judul" className="text-xl text-foreground">Pengaturan cookie</h2>
      <ul className="mt-4 divide-y divide-border">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-4 py-4">
            <label htmlFor={r.id} className="cursor-pointer">
              <span className="block font-semibold text-foreground">{r.t}</span>
              <span className="block text-sm text-muted-foreground">{r.d}</span>
            </label>
            <Switch id={r.id} checked={r.v} disabled={!r.set} onCheckedChange={(v) => r.set?.(v)} />
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={() => save(false, false)} className="min-h-11 rounded-full border border-border px-5 text-sm font-semibold hover:bg-brand-soft">Tolak semua</button>
        <button type="button" onClick={() => save(pref, ana)} className="min-h-11 rounded-full border border-primary px-5 text-sm font-semibold text-primary hover:bg-brand-soft">Simpan pilihan</button>
        <button type="button" onClick={() => save(true, true)} className="min-h-11 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:brightness-110">Terima semua</button>
      </div>
      <p role="status" aria-live="polite" className="mt-3 text-sm text-primary">{saved}</p>
    </section>
  );
}
