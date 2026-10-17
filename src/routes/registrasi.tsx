import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { z } from "zod";
import { guestSchema } from "@/lib/validation";
import { supabase, type Employee, type Purpose } from "@/lib/supabase";
import { SiteNav } from "@/components/SiteNav";

const navItems = [{ to: "/", label: "Beranda" }, { to: "/registrasi", label: "Registrasi Tamu" }, { to: "/panduan", label: "Panduan" }, { to: "/karyawan", label: "Karyawan" }, { to: "/admin/login", label: "Admin" }];

export const Route = createFileRoute("/registrasi")({
  head: () => ({
    meta: [
      { title: "Registrasi Tamu — Menara Nobu" },
      { name: "description", content: "Isi buku tamu digital Menara Nobu dengan cepat." },
      { property: "og:title", content: "Registrasi Tamu — Menara Nobu" },
      { property: "og:description", content: "Isi buku tamu digital Menara Nobu dengan cepat." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GuestForm,
});

const schema = guestSchema;
type Form = z.infer<typeof schema> & { notes: string; scheduled_at: string; is_important: string };
const empty: Form = { name: "", institution: "", phone: "", visit_purpose_id: "", employee_id: "", notes: "", scheduled_at: "", is_important: "" };
const LS_DRAFT = "nobu_draft";
const LS_TOKEN = "nobu_token";
const LS_OPENED = "nobu_opened";

type Status = "idle" | "saving" | "saved" | "offline" | "error";

function GuestForm() {
  const [form, setForm] = useState<Form>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [purposes, setPurposes] = useState<Purpose[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [savedAt, setSavedAt] = useState<string>("");
  const [restore, setRestore] = useState<Form | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState("");
  const [done, setDone] = useState(false);
  const [empSearch, setEmpSearch] = useState("");
  const dirty = useRef(false);
  const token = useRef<string>("");
  const formRef = useRef(form);
  formRef.current = form;

  useEffect(() => {
    supabase.from("employees").select("*").eq("is_active", true).order("name").then(({ data }) => setEmployees(data ?? []));
    supabase.from("visit_purposes").select("*").eq("is_active", true).order("name").then(({ data }) => setPurposes(data ?? []));
    token.current = localStorage.getItem(LS_TOKEN) || crypto.randomUUID();
    localStorage.setItem(LS_TOKEN, token.current);
    const raw = localStorage.getItem(LS_DRAFT);
    if (raw) {
      try {
        const d = JSON.parse(raw) as Form;
        if (Object.values(d).some((v) => v)) setRestore(d);
      } catch {}
    }
  }, []);

  // simpan lokal (debounce 500ms)
  useEffect(() => {
    if (!dirty.current) return;
    setStatus("saving");
    const t = setTimeout(() => {
      localStorage.setItem(LS_DRAFT, JSON.stringify(form));
      if (!navigator.onLine) setStatus("offline");
      else { setStatus("saved"); setSavedAt(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })); }
    }, 500);
    return () => clearTimeout(t);
  }, [form]);

  // sinkron server tiap 30 detik
  const syncPending = useRef(false);
  useEffect(() => {
    let retry = 0;
    const sync = async () => {
      if (!syncPending.current || !navigator.onLine) { if (!navigator.onLine && syncPending.current) setStatus("offline"); return; }
      const { error } = await supabase.rpc("upsert_draft", { _token: token.current, _payload: formRef.current });
      if (error) { setStatus("error"); retry++; setTimeout(sync, Math.min(30000, 2000 * 2 ** retry)); }
      else { retry = 0; syncPending.current = false; setStatus("saved"); setSavedAt(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })); }
    };
    const iv = setInterval(sync, 30000);
    const onOnline = () => sync();
    const onOffline = () => setStatus("offline");
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => { clearInterval(iv); window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
  }, []);

  const update = (k: keyof Form, v: string) => {
    dirty.current = true;
    // waktu isi dihitung sejak tamu mulai mengisi, bukan sejak halaman dibuka
    if (!localStorage.getItem(LS_OPENED)) localStorage.setItem(LS_OPENED, new Date().toISOString());
    syncPending.current = true;
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };

  const validateField = (k: keyof Form) => {
    const r = schema.safeParse(form);
    const issue = r.success ? undefined : r.error.issues.find((i) => i.path[0] === k);
    setErrors((e) => ({ ...e, [k]: issue?.message ?? "" }));
  };

  const clearAll = () => {
    localStorage.removeItem(LS_DRAFT);
    localStorage.removeItem(LS_OPENED);
    localStorage.removeItem(LS_TOKEN);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = schema.safeParse(form);
    if (!r.success) {
      const errs: Record<string, string> = {};
      r.error.issues.forEach((i) => { errs[String(i.path[0])] = i.message; });
      setErrors(errs as Partial<Record<keyof Form, string>>);
      setSubmitErr(`Periksa kembali ${Object.keys(errs).length} isian yang ditandai merah.`);
      const first = document.querySelector<HTMLElement>(`[name="${String(r.error.issues[0]?.path[0])}"]`);
      first?.focus();
      return;
    }
    setSubmitting(true);
    setSubmitErr("");
    const { error } = await supabase.rpc("submit_guest", {
      _payload: { ...r.data, scheduled_at: r.data.scheduled_at ? new Date(r.data.scheduled_at).toISOString() : null, is_important: r.data.is_important === "1", form_opened_at: localStorage.getItem(LS_OPENED) },
      _token: token.current,
    });
    setSubmitting(false);
    if (error) { setSubmitErr(navigator.onLine ? "Gagal mengirim. Isian Anda tetap tersimpan, silakan coba lagi." : "Tidak ada koneksi internet. Isian Anda tetap tersimpan, kirim lagi setelah tersambung."); return; }
    clearAll();
    dirty.current = false;
    syncPending.current = false;
    setDone(true);
    setTimeout(() => {
      setDone(false);
      setForm(empty);
      setStatus("idle");
      token.current = crypto.randomUUID();
      localStorage.setItem(LS_TOKEN, token.current);
    }, 8000);
  };

  const filteredEmp = employees.filter((x) => x.name.toLowerCase().includes(empSearch.toLowerCase()));
  const statusText = {
    idle: "",
    saving: "Menyimpan…",
    saved: `Tersimpan ${savedAt}`,
    offline: "Offline — tersimpan di perangkat",
    error: "Gagal sinkron, mencoba lagi",
  }[status];

  if (done) {
    return (
      <main className="min-h-screen bg-background">
        <SiteNav items={navItems} />
        <div className="flex items-center justify-center p-6 pt-16">
        <div className="fade-up max-w-md rounded-3xl bg-card p-10 text-center shadow-soft">
          <div className="mx-auto mb-4 flex h-16 w-16 animate-in zoom-in items-center justify-center rounded-full bg-brand text-3xl text-foreground duration-500">✓</div>
          <h1 className="text-2xl font-bold text-foreground">Terima kasih!</h1>
          <p className="mt-2 text-muted-foreground">Registrasi berhasil. Silakan menunggu, pihak yang Anda tuju akan segera dihubungi.</p>
        </div>
        </div>
      </main>
    );
  }

  const field = "mt-1 w-full rounded-xl border border-input bg-card px-4 py-3 text-base text-foreground transition-shadow focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/25";

  const fc = (k: keyof Form) => errors[k] ? field + " border-destructive bg-destructive/5 focus:border-destructive focus:ring-destructive/20" : field;

  return (
    <main className="min-h-screen bg-background">
      <SiteNav items={navItems} />
      <div className="mx-auto max-w-xl px-4 pb-10 pt-4 md:pt-8">
        <header className="fade-up mb-6 text-center">
          <span className="inline-block rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">Selamat datang</span>
          <h1 className="mt-1 text-3xl font-bold text-foreground md:text-4xl">Registrasi Tamu</h1>
          <p className="mt-1 text-muted-foreground">Silakan isi data kunjungan Anda</p>
        </header>

        {restore && (
          <div className="mb-4 fade-up rounded-2xl border border-brand bg-brand-soft p-4">
            <p className="font-medium text-foreground">Ada isian yang belum selesai. Lanjutkan?</p>
            <div className="mt-3 flex gap-2">
              <button className="min-h-11 flex-1 rounded-lg bg-primary px-4 text-primary-foreground" onClick={() => { setForm({ ...empty, ...restore }); setRestore(null); }}>Lanjutkan</button>
              <button className="min-h-11 flex-1 rounded-lg border border-input px-4 text-foreground" onClick={() => { clearAll(); supabase.rpc("delete_draft", { _token: token.current }); token.current = crypto.randomUUID(); localStorage.setItem(LS_TOKEN, token.current); localStorage.setItem(LS_OPENED, new Date().toISOString()); setRestore(null); }}>Mulai dari awal</button>
            </div>
          </div>
        )}

        <form onSubmit={submit} className="fade-up space-y-4 rounded-3xl bg-card p-5 shadow-soft [animation-delay:120ms] sm:p-7">
          <F required label="Nama lengkap" err={errors.name}>
            <input className={fc("name")} name="name" aria-invalid={!!errors.name} value={form.name} onChange={(e) => update("name", e.target.value)} onBlur={() => validateField("name")} autoComplete="name" />
          </F>
          <F required label="Instansi / Perusahaan" err={errors.institution}>
            <input className={fc("institution")} name="institution" aria-invalid={!!errors.institution} value={form.institution} onChange={(e) => update("institution", e.target.value)} onBlur={() => validateField("institution")} />
          </F>
          <F required hint="Contoh: 0812 3456 7890" label="Nomor telepon" err={errors.phone}>
            <input className={fc("phone")} name="phone" aria-invalid={!!errors.phone} inputMode="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} onBlur={() => validateField("phone")} />
          </F>
          <F required label="Tujuan kunjungan" err={errors.visit_purpose_id}>
            <select className={fc("visit_purpose_id")} name="visit_purpose_id" aria-invalid={!!errors.visit_purpose_id} value={form.visit_purpose_id} onChange={(e) => update("visit_purpose_id", e.target.value)} onBlur={() => validateField("visit_purpose_id")}>
              <option value="">— Pilih —</option>
              {purposes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </F>
          <F required label="Nama yang dituju" err={errors.employee_id}>
            <input className={field} placeholder="Cari nama…" value={empSearch} onChange={(e) => setEmpSearch(e.target.value)} />
            <select className={fc("employee_id")} name="employee_id" aria-invalid={!!errors.employee_id} value={form.employee_id} onChange={(e) => update("employee_id", e.target.value)} onBlur={() => validateField("employee_id")}>
              <option value="">— Pilih —</option>
              {filteredEmp.map((p) => <option key={p.id} value={p.id}>{p.name}{p.department ? ` (${p.department})` : ""}</option>)}
            </select>
          </F>
          <F label="Jadwal kunjungan (opsional — isi jika datang di lain waktu)" err={errors.scheduled_at}>
            <input type="datetime-local" className={fc("scheduled_at")} name="scheduled_at" aria-invalid={!!errors.scheduled_at} value={form.scheduled_at} onChange={(e) => update("scheduled_at", e.target.value)} onBlur={() => validateField("scheduled_at")} />
          </F>
          <label className="flex min-h-11 items-center gap-3 rounded-xl border border-input px-4">
            <input type="checkbox" className="h-5 w-5 accent-primary" checked={form.is_important === "1"} onChange={(e) => update("is_important", e.target.checked ? "1" : "")} />
            <span className="text-sm text-foreground">Tandai sebagai kunjungan penting</span>
          </label>
          <F label="Catatan (opsional)" err={errors.notes} hint={`${form.notes.length}/500 karakter`}>
            <textarea className={fc("notes")} name="notes" aria-invalid={!!errors.notes} maxLength={500} rows={3} value={form.notes} onChange={(e) => update("notes", e.target.value)} />
          </F>

          {submitErr && <p role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"><span aria-hidden>⚠</span>{submitErr}</p>}

          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground" aria-live="polite">{statusText}</span>
            <button type="submit" disabled={submitting} className="min-h-12 shrink-0 rounded-full bg-primary px-7 font-semibold text-primary-foreground shadow-soft transition-all hover:-translate-y-0.5 hover:brightness-110 active:scale-95 disabled:opacity-60">
              {submitting ? "Mengirim…" : submitErr ? "Coba lagi" : "Kirim"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function F({ label, err, hint, required, children }: { label: string; err?: string | undefined; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}{required && <span className="text-destructive" aria-hidden> *</span>}</span>
      {children}
      {err ? <span role="alert" className="mt-1 flex items-center gap-1 text-sm text-destructive"><span aria-hidden>⚠</span>{err}</span>
        : hint ? <span className="mt-1 block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}
