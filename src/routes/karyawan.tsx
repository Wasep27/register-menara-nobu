import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import logo from "@/assets/logo.png";
import { PasswordInput } from "@/components/ui/password-input";

export const Route = createFileRoute("/karyawan")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Portal Karyawan — Menara Nobu" },
      { name: "description", content: "Lihat notifikasi tamu dan jadwal kunjungan Anda." },
      { property: "og:title", content: "Portal Karyawan — Menara Nobu" },
      { property: "og:description", content: "Lihat notifikasi tamu dan jadwal kunjungan Anda." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StaffPortal,
});

type Notif = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
};
type Visit = {
  id: string;
  name: string;
  institution: string;
  scheduled_at: string;
  is_important: boolean;
};

import { formatWibDateTime as fmt } from "@/lib/date-utils";

function StaffPortal() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((e, s) => {
      if (e === "SIGNED_IN" || e === "SIGNED_OUT") setUser(s?.user ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (user === undefined)
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="relative mb-3 flex h-10 w-10 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
          </div>
          <p className="text-sm font-medium text-foreground">Memuat portal…</p>
        </div>
      </main>
    );

  return user ? <Inbox user={user} /> : <StaffLogin />;
}

function StaffLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const { data: lock } = await supabase.rpc("login_lock_seconds", { _email: email });
    if (typeof lock === "number" && lock > 0) {
      setLoading(false);
      return setErr(`Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(lock / 60)} menit.`);
    }
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    await supabase.rpc("record_login_attempt", { _email: email.trim(), _success: !error });
    setLoading(false);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("invalid login credentials")) {
        setErr("Email atau password tidak sesuai.");
      } else if (msg.includes("not confirmed")) {
        setErr("Email belum dikonfirmasi di Supabase.");
      } else {
        setErr(error.message);
      }
    }
  };
  const f = "mt-1 w-full rounded-lg border border-input bg-card px-3 py-3 text-foreground";
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background p-4">
      <Link
        to="/"
        className="absolute left-4 top-4 inline-flex min-h-11 items-center rounded-full bg-card px-4 text-sm font-medium text-primary shadow-soft"
      >
        ← Kembali
      </Link>
      <form
        onSubmit={submit}
        className="fade-up w-full max-w-sm space-y-4 rounded-3xl bg-card p-8 shadow-soft"
      >
        <img src={logo} alt="Nobu" className="mx-auto h-9 w-auto" />
        <h1 className="text-center text-xl font-bold text-foreground">Portal Karyawan</h1>
        <p className="text-center text-sm text-muted-foreground">
          Khusus karyawan internal untuk memantau notifikasi kedatangan tamu.
        </p>
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
          <PasswordInput
            className={f}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
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
        <button
          disabled={loading}
          className="min-h-11 w-full rounded-full bg-primary font-semibold text-primary-foreground transition-all hover:brightness-110 active:scale-95"
        >
          {loading ? "Masuk…" : "Masuk"}
        </button>

        <div className="border-t border-border/60 pt-3 text-center text-xs">
          <span className="text-muted-foreground">Petugas Keamanan / Resepsionis? </span>
          <Link to="/admin/login" className="font-semibold text-primary hover:underline">
            Login di Sini →
          </Link>
        </div>
      </form>
    </main>
  );
}

function Inbox({ user }: { user: User }) {
  const [emp, setEmp] = useState<{ id: string; name: string } | null | undefined>(undefined);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [toast, setToast] = useState<string>("");

  const load = useCallback(async (empId: string) => {
    const [n, v] = await Promise.all([
      supabase
        .from("notifications")
        .select("*")
        .eq("employee_id", empId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("guests")
        .select("id,name,institution,scheduled_at,is_important")
        .eq("employee_id", empId)
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at")
        .limit(20),
    ]);
    setNotifs((n.data as Notif[]) ?? []);
    setVisits((v.data as Visit[]) ?? []);
  }, []);

  useEffect(() => {
    supabase
      .from("employees")
      .select("id,name")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setEmp(data);
        if (data) load(data.id);
      });
  }, [user.id, load]);

  useEffect(() => {
    if (!emp) return;
    const ch = supabase
      .channel(`notif-${emp.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `employee_id=eq.${emp.id}`,
        },
        (p) => {
          const n = p.new as Notif;
          setToast(n.title);
          setTimeout(() => setToast(""), 6000);
          load(emp.id);
        },
      )
      .subscribe();
    const tick = async () => {
      if (document.hidden) return;
      await supabase.rpc("generate_visit_reminders");
      load(emp.id);
    };
    tick();
    const iv = setInterval(tick, 30000);
    const onVisibility = () => {
      if (!document.hidden) void tick();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      supabase.removeChannel(ch);
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [emp, load]);

  const markAll = async () => {
    if (!emp) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("employee_id", emp.id)
      .is("read_at", null);
    load(emp.id);
  };
  const markOne = async (id: string) => {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    if (emp) load(emp.id);
  };
  const unread = notifs.filter((n) => !n.read_at).length;
  const today = new Date().toDateString();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);
  const next = visits.find(
    (v) => v.is_important && new Date(v.scheduled_at).getTime() - now <= 30 * 60000,
  );
  const mins = next
    ? Math.max(0, Math.round((new Date(next.scheduled_at).getTime() - now) / 60000))
    : 0;
  const soonImportant = visits.filter(
    (v) => v.is_important && new Date(v.scheduled_at).toDateString() === today,
  );

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/90 px-4 py-3 backdrop-blur">
        <img src={logo} alt="Nobu" className="h-7 w-auto" />
        <button
          className="min-h-11 rounded-full px-4 text-sm text-muted-foreground hover:bg-brand-soft hover:text-primary"
          onClick={() => supabase.auth.signOut()}
        >
          Keluar
        </button>
      </header>

      {toast && (
        <div
          role="status"
          className="fade-up fixed inset-x-4 top-16 z-20 mx-auto max-w-md rounded-2xl bg-primary p-4 text-primary-foreground shadow-soft"
        >
          🔔 {toast}
        </div>
      )}

      <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-6">
        {emp === undefined ? (
          <div className="space-y-6" aria-busy="true">
            <div className="rounded-2xl bg-card p-6 shadow-soft space-y-3">
              <div className="h-3.5 w-16 rounded-full skeleton-shimmer" />
              <div className="h-8 w-48 rounded-lg skeleton-shimmer" />
            </div>
            <div className="rounded-2xl bg-card p-6 shadow-soft space-y-4">
              <div className="h-5 w-52 rounded-full skeleton-shimmer" />
              <div className="space-y-3">
                <div className="h-16 w-full rounded-xl skeleton-shimmer" />
                <div className="h-16 w-full rounded-xl skeleton-shimmer opacity-75" />
              </div>
            </div>
          </div>
        ) : !emp ? (
          <div className="rounded-2xl bg-card p-6 shadow-soft">
            <p className="text-foreground">
              Akun <b>{user.email}</b> belum terhubung dengan data karyawan.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Minta admin mengisi email ini pada menu Karyawan.
            </p>
          </div>
        ) : (
          <>
            <div>
              <p className="text-sm text-muted-foreground">Halo,</p>
              <h1 className="text-2xl font-bold text-foreground">{emp.name}</h1>
            </div>

            {next && (
              <div
                role="alert"
                className="fade-up rounded-2xl bg-primary p-4 text-primary-foreground shadow-soft"
              >
                <p className="font-bold">
                  {mins > 0 ? `⏰ ${mins} menit lagi` : "🔔 Waktunya sekarang"}: {next.name}
                </p>
                <p className="text-sm opacity-90">
                  {next.institution} · {fmt(next.scheduled_at)}
                </p>
              </div>
            )}

            {soonImportant.length > 0 && (
              <div className="rounded-2xl border border-brand bg-brand-soft p-4">
                <p className="font-semibold text-foreground">⭐ Kunjungan penting hari ini</p>
                {soonImportant.map((v) => (
                  <p key={v.id} className="mt-1 text-sm text-foreground">
                    {fmt(v.scheduled_at)} — {v.name} ({v.institution})
                  </p>
                ))}
              </div>
            )}

            <section>
              <h2 className="mb-2 text-lg font-bold text-foreground">Jadwal kunjungan mendatang</h2>
              <div className="rounded-2xl bg-card shadow-soft">
                {visits.length === 0 && (
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-primary shadow-sm">
                      <span className="text-xl">📅</span>
                    </div>
                    <p className="mt-3 font-semibold text-foreground">Belum Ada Jadwal Kunjungan</p>
                    <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                      Buku tamu akan mengirimkan notifikasi dan memunculkan jadwal di sini ketika
                      ada tamu yang memilih Anda.
                    </p>
                  </div>
                )}
                {visits.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center gap-3 border-b border-border p-4 last:border-0"
                  >
                    <span className="flex-1">
                      <span className="font-medium text-foreground">{v.name}</span>
                      <span className="block text-sm text-muted-foreground">{v.institution}</span>
                    </span>
                    <span className="text-right text-sm text-foreground">
                      {fmt(v.scheduled_at)}
                      {v.is_important && (
                        <span className="block text-xs font-semibold text-primary">Penting</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground">
                  Notifikasi{" "}
                  {unread > 0 && (
                    <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                      {unread}
                    </span>
                  )}
                </h2>
                {unread > 0 && (
                  <button className="text-sm text-primary" onClick={markAll}>
                    Tandai semua dibaca
                  </button>
                )}
              </div>
              <div className="rounded-2xl bg-card shadow-soft">
                {notifs.length === 0 && (
                  <p className="p-4 text-sm text-muted-foreground">Belum ada notifikasi.</p>
                )}
                {notifs.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => !n.read_at && markOne(n.id)}
                    className={`block w-full border-b border-border p-4 text-left last:border-0 ${n.read_at ? "" : "bg-brand-soft/60"}`}
                  >
                    <span className="flex items-start gap-2">
                      {!n.read_at && (
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                      <span className="flex-1">
                        <span className="block font-medium text-foreground">{n.title}</span>
                        {n.body && (
                          <span className="block text-sm text-muted-foreground">{n.body}</span>
                        )}
                        <span className="block text-xs text-muted-foreground">
                          {fmt(n.created_at)}
                        </span>
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
