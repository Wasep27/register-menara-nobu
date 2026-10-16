import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase, supabaseUrl } from "@/lib/supabase";
import { SiteNav } from "@/components/SiteNav";

export const Route = createFileRoute("/panduan")({
  head: () => ({
    meta: [
      { title: "Panduan Deploy Vercel — Menara Nobu" },
      { name: "description", content: "Langkah mengatur Supabase di Vercel dan mengecek koneksi aplikasi buku tamu." },
      { property: "og:title", content: "Panduan Deploy Vercel — Menara Nobu" },
      { property: "og:description", content: "Langkah mengatur Supabase di Vercel dan mengecek koneksi aplikasi buku tamu." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Guide,
});

type Check = { label: string; ok: boolean | null; note: string };

function Guide() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    const out: Check[] = [];
    out.push({ label: "Alamat Supabase terbaca", ok: !!supabaseUrl, note: supabaseUrl || "Belum diatur" });
    const emp = await supabase.from("employees").select("id", { count: "exact", head: true });
    out.push({ label: "Terhubung ke database", ok: !emp.error, note: emp.error ? emp.error.message : `${emp.count ?? 0} karyawan aktif` });
    const p = await supabase.from("visit_purposes").select("id", { count: "exact", head: true });
    out.push({ label: "Data tujuan kunjungan", ok: !p.error && (p.count ?? 0) > 0, note: p.error ? p.error.message : `${p.count ?? 0} tujuan` });
    const d = await supabase.rpc("get_draft", { _token: crypto.randomUUID() });
    out.push({ label: "Fungsi simpan otomatis", ok: !d.error, note: d.error ? "Jalankan ulang skrip SQL" : "Siap" });
    const l = await supabase.rpc("login_lock_seconds", { _email: "cek@contoh.com" });
    out.push({ label: "Pembatasan login", ok: !l.error, note: l.error ? "Jalankan ulang skrip SQL" : "Aktif" });
    const g = await supabase.from("guests").select("id").limit(1);
    out.push({ label: "Data tamu terlindungi", ok: (g.data?.length ?? 0) === 0, note: (g.data?.length ?? 0) === 0 ? "Pengunjung umum tidak bisa membaca data tamu" : "PERINGATAN: data tamu terbaca publik" });
    setChecks(out);
    setRunning(false);
  };

  const step = "rounded-2xl bg-card p-5 shadow-soft";
  const code = "mt-2 block overflow-x-auto rounded-lg bg-muted px-3 py-2 font-mono text-sm text-foreground";

  return (
    <main className="min-h-screen bg-background">
      <SiteNav items={[{ to: "/", label: "Beranda" }, { to: "/registrasi", label: "Registrasi Tamu" }, { to: "/panduan", label: "Panduan" }, { to: "/admin/login", label: "Admin" }]} />
      <div className="fade-up mx-auto max-w-3xl space-y-5 px-4 py-6">
        <h1 className="text-3xl font-bold text-foreground">Panduan Deploy ke Vercel</h1>

        <section className={step}>
          <h2 className="text-lg font-bold">1. Siapkan database</h2>
          <p className="mt-1 text-muted-foreground">Di Supabase buka <b>SQL Editor</b>, tempel seluruh isi <code>supabase/schema.sql</code>, lalu klik <b>Run</b>.</p>
        </section>

        <section className={step}>
          <h2 className="text-lg font-bold">2. Ambil kunci dari Supabase</h2>
          <p className="mt-1 text-muted-foreground">Buka <b>Project Settings → API</b>. Salin <b>Project URL</b> dan <b>anon / publishable key</b>. Jangan pernah memakai kunci <b>service_role</b> di sini.</p>
        </section>

        <section className={step}>
          <h2 className="text-lg font-bold">3. Isi pengaturan di Vercel</h2>
          <p className="mt-1 text-muted-foreground">Di Vercel buka proyek → <b>Settings → Environment Variables</b>, tambahkan dua baris ini untuk Production, Preview, dan Development:</p>
          <code className={code}>VITE_SUPABASE_URL = https://xxxx.supabase.co</code>
          <code className={code}>VITE_SUPABASE_ANON_KEY = (anon key Anda)</code>
          <p className="mt-2 text-sm text-muted-foreground">Setelah disimpan, buka tab <b>Deployments</b> lalu klik <b>Redeploy</b> agar pengaturan dipakai.</p>
        </section>

        <section className={step}>
          <h2 className="text-lg font-bold">4. Izinkan alamat situs di Supabase</h2>
          <p className="mt-1 text-muted-foreground">Di Supabase buka <b>Authentication → URL Configuration</b>. Isi <b>Site URL</b> dengan alamat Vercel Anda, lalu tambahkan juga di Redirect URLs:</p>
          <code className={code}>https://nama-app.vercel.app/reset-password</code>
          <p className="mt-2 text-sm text-muted-foreground">Ini dibutuhkan agar tautan "Lupa password" mengarah ke situs Anda.</p>
        </section>

        <section className={step}>
          <h2 className="text-lg font-bold">5. Cek koneksi</h2>
          <p className="mt-1 text-muted-foreground">Buka halaman ini di situs Vercel Anda, lalu tekan tombol di bawah.</p>
          <button onClick={run} disabled={running} className="mt-3 min-h-11 rounded-full bg-primary px-6 font-semibold text-primary-foreground transition-all active:scale-95 disabled:opacity-60">{running ? "Memeriksa…" : "Cek koneksi sekarang"}</button>
          {checks.length > 0 && (
            <ul className="mt-4 space-y-2">
              {checks.map((c) => (
                <li key={c.label} className="flex items-start gap-3 rounded-xl bg-muted p-3">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold ${c.ok ? "bg-brand text-foreground" : "bg-destructive text-primary-foreground"}`}>{c.ok ? "✓" : "!"}</span>
                  <div className="min-w-0"><p className="font-medium">{c.label}</p><p className="break-all text-sm text-muted-foreground">{c.note}</p></div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
