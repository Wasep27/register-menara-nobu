import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  const [checking, setChecking] = useState(true);

  // Jika sudah login, langsung alihkan ke dashboard agar tidak bingung
  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      if (data.user) nav({ to: "/admin", replace: true });
      else setChecking(false);
    });
    return () => {
      active = false;
    };
  }, [nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setInfo("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return setErr("Format email tidak valid, contoh admin@nobu.id");
    if (!password) return setErr("Password wajib diisi.");
    setLoading(true);
    const { data: lock } = await supabase.rpc("login_lock_seconds", { _email: email });
    if (typeof lock === "number" && lock > 0) {
      setLoading(false);
      return setErr(
        `Terlalu banyak percobaan gagal. Coba lagi dalam ${Math.ceil(lock / 60)} menit.`,
      );
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    await supabase.rpc("record_login_attempt", { _email: email, _success: !error });
    setLoading(false);
    if (error)
      return setErr(
        !navigator.onLine
          ? "Tidak ada koneksi internet. Periksa jaringan lalu coba lagi."
          : error.message.includes("not confirmed")
            ? "Email belum dikonfirmasi. Cek kotak masuk email Anda."
            : "Email atau password salah. Setelah 5 kali gagal, akun dikunci 15 menit.",
      );
    nav({ to: "/admin" });
  };
  const forgot = async () => {
    setErr("");
    setInfo("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return setErr("Isi email yang valid terlebih dahulu, lalu tekan Lupa password.");
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setInfo("Jika email terdaftar, tautan untuk mengatur ulang password sudah dikirim.");
  };
  if (checking)
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="relative mb-3 flex h-10 w-10 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
          </div>
          <p className="text-sm font-medium text-foreground">Memeriksa sesi…</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Mohon tunggu sebentar</p>
        </div>
      </main>
    );
  const f = "mt-1 w-full rounded-lg border border-input bg-card px-3 py-3 text-foreground";
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background p-4">
      <Link
        to="/"
        className="absolute left-4 top-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-card px-4 text-sm font-medium text-primary shadow-soft transition-transform hover:-translate-x-0.5"
      >
        ← Kembali
      </Link>
      <form
        onSubmit={submit}
        className="fade-up w-full max-w-sm space-y-4 rounded-3xl bg-card p-8 shadow-soft"
      >
        <img src={logo} alt="Nobu" className="mx-auto h-9 w-auto" />
        <h1 className="text-center text-xl font-bold text-foreground">Login Admin</h1>
        <label className="block text-sm">
          Email
          <input
            className={f}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          Password
          <input
            className={f}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {err && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          >
            <span aria-hidden>⚠</span>
            {err}
          </p>
        )}
        {info && (
          <p
            role="status"
            className="flex items-start gap-2 rounded-xl border border-primary/30 bg-brand-soft p-3 text-sm text-primary"
          >
            <span aria-hidden>✓</span>
            {info}
          </p>
        )}
        <button
          disabled={loading}
          className="min-h-11 w-full rounded-full bg-primary font-semibold transition-all hover:brightness-110 active:scale-95 text-primary-foreground"
        >
          {loading ? "Masuk…" : "Masuk"}
        </button>
        <button type="button" className="w-full text-sm text-primary" onClick={forgot}>
          Lupa password?
        </button>
      </form>
    </main>
  );
}
