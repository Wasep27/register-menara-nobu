import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Atur Ulang Password — Menara Nobu" },
      { name: "description", content: "Atur ulang password akun admin buku tamu Menara Nobu." },
      { property: "og:title", content: "Atur Ulang Password — Menara Nobu" },
      {
        property: "og:description",
        content: "Atur ulang password akun admin buku tamu Menara Nobu.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reset,
});

function Reset() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState("");
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((ev) => {
      if (ev === "PASSWORD_RECOVERY" || ev === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data: d }) => {
      if (d.session) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8 || !/[0-9]/.test(pw) || !/[A-Za-z]/.test(pw))
      return setMsg("Password minimal 8 karakter, berisi huruf dan angka.");
    if (pw !== pw2) return setMsg("Konfirmasi password tidak sama.");
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return setMsg("Gagal menyimpan password. Minta tautan baru.");
    await supabase.auth.signOut();
    nav({ to: "/admin/login" });
  };
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
        <h1 className="text-center text-xl font-bold text-foreground">Atur Ulang Password</h1>
        {!ready ? (
          <p className="text-sm text-muted-foreground">
            Buka halaman ini dari tautan di email Anda.
          </p>
        ) : (
          <>
            <label className="block text-sm">
              Password baru
              <input
                className={f}
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              Ulangi password
              <input
                className={f}
                type="password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
              />
            </label>
            {msg && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
              >
                <span aria-hidden>⚠</span>
                {msg}
              </p>
            )}
            <button className="min-h-11 w-full rounded-full bg-primary font-semibold text-primary-foreground">
              Simpan
            </button>
          </>
        )}
      </form>
    </main>
  );
}
