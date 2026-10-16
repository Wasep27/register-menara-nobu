import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/admin_/login")({
  head: () => ({
    meta: [
      { title: "Login Admin — Menara Nobu" },
      { name: "description", content: "Masuk ke dashboard buku tamu Menara Nobu." },
      { property: "og:title", content: "Login Admin — Menara Nobu" },
      { property: "og:description", content: "Masuk ke dashboard buku tamu Menara Nobu." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Login,
});

function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr("");
    const { data: lock } = await supabase.rpc("login_lock_seconds", { _email: email });
    if (typeof lock === "number" && lock > 0) {
      setLoading(false);
      return setErr(`Terlalu banyak percobaan gagal. Coba lagi dalam ${Math.ceil(lock / 60)} menit.`);
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    await supabase.rpc("record_login_attempt", { _email: email, _success: !error });
    setLoading(false);
    if (error) return setErr("Email atau password salah. Setelah 5 kali gagal, akun dikunci 15 menit.");
    nav({ to: "/admin" });
  };
  const forgot = async () => {
    setErr(""); setInfo("");
    if (!email) return setErr("Isi email terlebih dahulu.");
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    setInfo("Jika email terdaftar, tautan untuk mengatur ulang password sudah dikirim.");
  };
  const f = "mt-1 w-full rounded-lg border border-input bg-card px-3 py-3 text-foreground";
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background p-4">
      <Link to="/" className="absolute left-4 top-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-card px-4 text-sm font-medium text-primary shadow-soft transition-transform hover:-translate-x-0.5">← Kembali</Link>
      <form onSubmit={submit} className="fade-up w-full max-w-sm space-y-4 rounded-3xl bg-card p-8 shadow-soft">
        <img src={logo.url} alt="Nobu" className="mx-auto h-9 w-auto" />
        <h1 className="text-center text-xl font-bold text-foreground">Login Admin</h1>
        <label className="block text-sm">Email<input className={f} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label className="block text-sm">Password<input className={f} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {err && <p className="text-sm text-destructive">{err}</p>}
        {info && <p className="text-sm text-primary">{info}</p>}
        <button disabled={loading} className="min-h-11 w-full rounded-full bg-primary font-semibold transition-all hover:brightness-110 active:scale-95 text-primary-foreground">{loading ? "Masuk…" : "Masuk"}</button>
        <button type="button" className="w-full text-sm text-primary" onClick={forgot}>Lupa password?</button>
      </form>
    </main>
  );
}
