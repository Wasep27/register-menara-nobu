import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  RefreshCw,
  Copy,
  Check,
  Mail,
  MessageSquare,
  ExternalLink,
  ShieldAlert,
  UserCheck,
  LogOut,
  Sparkles,
  HelpCircle,
  ArrowRight,
  Link2Off,
  ShieldCheck,
  UserPlus,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import logo from "@/assets/logo.png";
import { PasswordInput } from "@/components/ui/password-input";
import { formatWibDateTime as fmt } from "@/lib/date-utils";

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

type UnlinkedEmployee = {
  id: string;
  name: string;
  department: string | null;
};

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
  const [toastMsg, setToastMsg] = useState<string>("");
  const [checkingLink, setCheckingLink] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Status role admin
  const [isAdmin, setIsAdmin] = useState(false);
  const [unlinkedEmployees, setUnlinkedEmployees] = useState<UnlinkedEmployee[]>([]);

  // Form self-service untuk admin
  const [adminSelfName, setAdminSelfName] = useState(
    (user.user_metadata?.["full_name"] as string) ||
      user.email?.split("@")[0]?.replace(/[._]/g, " ") ||
      "Administrator",
  );
  const [adminSelfDept, setAdminSelfDept] = useState("Manajemen / IT");
  const [selectedUnlinkedEmpId, setSelectedUnlinkedEmpId] = useState("");
  const [savingSelfLink, setSavingSelfLink] = useState(false);

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

  const checkEmployeeLink = useCallback(
    async (isManual = false) => {
      setCheckingLink(true);
      try {
        // Cek apakah user memiliki peran admin
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);
        const hasAdminRole = roles?.some((r) => r.role === "admin") ?? false;
        setIsAdmin(hasAdminRole);

        // 1. Cek langsung lewat foreign key user_id
        const { data: byUserId } = await supabase
          .from("employees")
          .select("id,name")
          .eq("user_id", user.id)
          .maybeSingle();

        if (byUserId) {
          setEmp(byUserId);
          load(byUserId.id);
          if (isManual) {
            toast.success(`Akun berhasil terhubung dengan data: ${byUserId.name}`);
          }
          return;
        }

        // 2. Jika user_id belum terisi, coba sambungkan lewat email
        if (user.email) {
          const { data: byEmail } = await supabase
            .from("employees")
            .select("id,name")
            .ilike("email", user.email.trim())
            .maybeSingle();

          if (byEmail) {
            try {
              await supabase.from("employees").update({ user_id: user.id }).eq("id", byEmail.id);
            } catch {
              // Abaikan jika RLS membatasi, trigger menangani
            }
            setEmp(byEmail);
            load(byEmail.id);
            if (isManual) {
              toast.success(`Akun berhasil ditautkan ke karyawan: ${byEmail.name}!`);
            }
            return;
          }
        }

        // Jika belum tertaut dan berstatus admin, ambil daftar karyawan yang belum punya user_id
        if (hasAdminRole) {
          const { data: unlinked } = await supabase
            .from("employees")
            .select("id,name,department")
            .is("user_id", null)
            .order("name");
          setUnlinkedEmployees(unlinked ?? []);
        }

        setEmp(null);
        if (isManual) {
          if (hasAdminRole) {
            toast.info(
              "Akun Admin Anda belum tertaut ke data karyawan. Silakan buat atau tautkan profil Anda di bawah.",
            );
          } else {
            toast.info(
              "Akun belum terhubung. Pastikan Administrator telah mengisi email Anda pada menu Karyawan.",
            );
          }
        }
      } catch (err) {
        console.warn("Gagal mengecek akun karyawan:", err);
        if (isManual) {
          toast.error("Gagal memeriksa status sambungan. Silakan coba beberapa saat lagi.");
        }
      } finally {
        setCheckingLink(false);
      }
    },
    [user.id, user.email, load],
  );

  useEffect(() => {
    checkEmployeeLink(false);
  }, [checkEmployeeLink]);

  // Aksi khusus admin: membuat profil karyawan sendiri secara langsung
  const handleAdminCreateSelfEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminSelfName.trim()) {
      toast.error("Nama karyawan tidak boleh kosong.");
      return;
    }

    setSavingSelfLink(true);
    try {
      const { data: newEmp, error } = await supabase
        .from("employees")
        .insert({
          name: adminSelfName.trim(),
          department: adminSelfDept.trim() || "Manajemen",
          email: user.email?.trim(),
          user_id: user.id,
          is_active: true,
        })
        .select("id,name")
        .single();

      if (error) {
        throw error;
      }

      toast.success(`Profil karyawan berhasil dibuat atas nama: ${newEmp.name}!`);
      setEmp(newEmp);
      load(newEmp.id);
    } catch (err: unknown) {
      console.error("Gagal membuat profil karyawan mandiri:", err);
      toast.error(
        err instanceof Error ? err.message : "Gagal membuat profil karyawan. Silakan coba lagi.",
      );
    } finally {
      setSavingSelfLink(false);
    }
  };

  // Aksi khusus admin: menautkan akun admin ke data karyawan yang sudah terdaftar
  const handleAdminLinkExistingEmployee = async () => {
    if (!selectedUnlinkedEmpId) {
      toast.error("Pilih nama karyawan terlebih dahulu.");
      return;
    }

    setSavingSelfLink(true);
    try {
      const selected = unlinkedEmployees.find((e) => e.id === selectedUnlinkedEmpId);
      const { error } = await supabase
        .from("employees")
        .update({
          user_id: user.id,
          email: user.email?.trim(),
        })
        .eq("id", selectedUnlinkedEmpId);

      if (error) {
        throw error;
      }

      toast.success(`Akun Anda berhasil ditautkan ke data: ${selected?.name || "Karyawan"}!`);
      const linkedData = {
        id: selectedUnlinkedEmpId,
        name: selected?.name || "Karyawan",
      };
      setEmp(linkedData);
      load(linkedData.id);
    } catch (err: unknown) {
      console.error("Gagal menautkan data karyawan:", err);
      toast.error(err instanceof Error ? err.message : "Gagal menautkan profil karyawan.");
    } finally {
      setSavingSelfLink(false);
    }
  };

  const copyEmailToClipboard = async () => {
    if (!user.email) return;
    try {
      await navigator.clipboard.writeText(user.email);
      setCopiedEmail(true);
      toast.success("Email berhasil disalin ke clipboard!");
      setTimeout(() => setCopiedEmail(false), 2500);
    } catch {
      toast.error("Gagal menyalin email otomatis.");
    }
  };

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
          setToastMsg(n.title);
          setTimeout(() => setToastMsg(""), 6000);
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

  const waMessage = encodeURIComponent(
    `Halo Admin Menara Nobu, mohon bantuannya untuk menautkan akun email saya (${user.email || ""}) ke profil Karyawan saya di menu Master Karyawan agar saya dapat menerima notifikasi kedatangan tamu. Terima kasih.`,
  );
  const mailtoSubject = encodeURIComponent("Permintaan Tautan Akun Karyawan — Menara Nobu");
  const mailtoBody = encodeURIComponent(
    `Halo Administrator Menara Nobu,\n\nMohon tautkan akun email saya:\n${user.email || ""}\n\nke data karyawan saya pada menu Karyawan (/admin/karyawan) agar saya dapat mengakses notifikasi kedatangan tamu.\n\nTerima kasih.`,
  );

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/90 px-4 py-3 backdrop-blur">
        <img src={logo} alt="Nobu" className="h-7 w-auto" />
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link
              to="/admin"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-brand-soft hover:text-primary transition-all"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span>Dashboard Admin</span>
            </Link>
          )}
          <button
            className="min-h-11 rounded-full px-4 text-sm text-muted-foreground transition-colors hover:bg-brand-soft hover:text-primary"
            onClick={() => supabase.auth.signOut()}
          >
            Keluar
          </button>
        </div>
      </header>

      {toastMsg && (
        <div
          role="status"
          className="fade-up fixed inset-x-4 top-16 z-20 mx-auto max-w-md rounded-2xl bg-primary p-4 text-primary-foreground shadow-soft"
        >
          🔔 {toastMsg}
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
          isAdmin ? (
            /* =========================================================================
             * TAMPILAN KHUSUS ADMINISTRATOR
             * Admin memiliki hak penuh; tidak perlu meminta admin lain!
             * ========================================================================= */
            <div className="fade-up rounded-2xl sm:rounded-3xl border border-border/80 bg-card p-4 sm:p-7 shadow-soft space-y-5 sm:space-y-6">
              {/* Header Status Admin */}
              <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-brand-soft text-primary shadow-2xs">
                  <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-[11px] sm:text-xs font-bold text-primary">
                      <Sparkles className="h-3 w-3" />
                      Akun Administrator
                    </span>
                    <span className="inline-flex items-center rounded-full bg-muted/80 px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground font-mono break-all">
                      {user.email}
                    </span>
                  </div>
                  <h1 className="mt-2 font-display text-lg sm:text-2xl font-black text-foreground tracking-tight leading-snug">
                    Profil Karyawan Belum Didaftarkan
                  </h1>
                  <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Akun Anda terverifikasi dengan hak akses{" "}
                    <strong className="text-foreground">Administrator</strong>. Namun, nama Anda
                    belum tercantum di daftar staf penerima tamu (<code>employees</code>) yang dapat
                    dipilih pengunjung saat registrasi di lobi gedung.
                  </p>
                  <div className="mt-2.5 flex items-start gap-2 rounded-xl bg-brand-soft/60 px-3 py-2 text-[11px] sm:text-xs text-foreground font-medium border border-brand/20">
                    <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                    <span>
                      Sebagai Admin, Anda dapat langsung mendaftarkan profil Anda sendiri di bawah
                      ini tanpa perlu meminta izin siapapun.
                    </span>
                  </div>
                </div>
              </div>

              {/* Opsi 1: Buat & Tautkan Profil Langsung */}
              <div className="rounded-xl sm:rounded-2xl border border-brand/30 bg-gradient-to-b from-brand-soft/40 to-background p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <UserPlus className="h-4 w-4 text-primary shrink-0" />
                  <h2 className="font-display text-xs sm:text-sm font-bold text-foreground">
                    Opsi 1: Buat Profil Karyawan Atas Nama Saya Sendiri (1-Klik)
                  </h2>
                </div>
                <form onSubmit={handleAdminCreateSelfEmployee} className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2 text-xs">
                    <div>
                      <label className="block font-semibold text-muted-foreground mb-1 text-xs">
                        Nama Lengkap (Tampil di Lobi):
                      </label>
                      <input
                        type="text"
                        required
                        value={adminSelfName}
                        onChange={(e) => setAdminSelfName(e.target.value)}
                        placeholder="Contoh: Budi Santoso"
                        className="w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-muted-foreground mb-1 text-xs">
                        Divisi / Jabatan:
                      </label>
                      <input
                        type="text"
                        value={adminSelfDept}
                        onChange={(e) => setAdminSelfDept(e.target.value)}
                        placeholder="Contoh: Manajemen / IT"
                        className="w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs"
                      />
                    </div>
                  </div>

                  <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <p className="text-[11px] text-muted-foreground leading-normal">
                      Email login Anda (<b>{user.email}</b>) otomatis ditautkan ke profil ini.
                    </p>
                    <button
                      type="submit"
                      disabled={savingSelfLink}
                      className="w-full sm:w-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-xs sm:text-sm font-bold text-primary-foreground shadow-sm transition-all hover:brightness-110 active:scale-95 disabled:opacity-60"
                    >
                      <UserCheck className="h-4 w-4" />
                      <span>
                        {savingSelfLink ? "Menyimpan..." : "Daftarkan Profil Saya Langsung"}
                      </span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Opsi 2: Tautkan ke Data Karyawan yang Sudah Ada */}
              {unlinkedEmployees.length > 0 && (
                <div className="rounded-xl sm:rounded-2xl border border-border bg-muted/30 p-4 sm:p-5 space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <h2 className="font-display text-xs sm:text-sm font-bold text-foreground">
                      Opsi 2: Tautkan ke Data Karyawan yang Sudah Terdaftar di Sistem
                    </h2>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Pilih nama Anda jika sebelumnya sudah didaftarkan di master data karyawan:
                  </p>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    <select
                      value={selectedUnlinkedEmpId}
                      onChange={(e) => setSelectedUnlinkedEmpId(e.target.value)}
                      className="w-full sm:flex-1 rounded-xl border border-input bg-card px-3.5 py-2.5 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-2xs"
                    >
                      <option value="">-- Pilih Nama Karyawan --</option>
                      {unlinkedEmployees.map((ue) => (
                        <option key={ue.id} value={ue.id}>
                          {ue.name} {ue.department ? `(${ue.department})` : ""}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAdminLinkExistingEmployee}
                      disabled={!selectedUnlinkedEmpId || savingSelfLink}
                      className="w-full sm:w-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-xs font-bold text-foreground hover:bg-brand-soft hover:text-primary transition-all active:scale-95 disabled:opacity-40 shadow-2xs"
                    >
                      <Check className="h-4 w-4 text-primary" />
                      <span>Tautkan ke Nama Terpilih</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Pintasan Modul Administrator */}
              <div className="pt-3 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <Link
                    to="/admin/karyawan"
                    className="w-full sm:w-auto inline-flex items-center gap-1.5 font-bold text-primary hover:underline py-1"
                  >
                    Buka Master Karyawan (/admin/karyawan) <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <span className="hidden sm:inline text-muted-foreground">•</span>
                  <Link
                    to="/admin"
                    className="w-full sm:w-auto inline-flex items-center gap-1.5 font-bold text-foreground hover:text-primary py-1"
                  >
                    Ke Dashboard Admin (/admin)
                  </Link>
                </div>
                <button
                  type="button"
                  onClick={() => checkEmployeeLink(true)}
                  disabled={checkingLink}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-primary py-1"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${checkingLink ? "animate-spin" : ""}`} />
                  <span>Segarkan Status</span>
                </button>
              </div>
            </div>
          ) : (
            /* =========================================================================
             * TAMPILAN KARYAWAN REGULER (NON-ADMIN)
             * ========================================================================= */
            <div className="fade-up rounded-2xl sm:rounded-3xl border border-border/80 bg-card p-4 sm:p-7 shadow-soft space-y-5 sm:space-y-6">
              {/* Header Status */}
              <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-destructive/10 text-destructive shadow-2xs">
                  <Link2Off className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] sm:text-xs font-bold text-destructive">
                    Status: Belum Terhubung
                  </span>
                  <h1 className="mt-2 font-display text-lg sm:text-2xl font-black text-foreground tracking-tight leading-snug">
                    Akun Email Belum Terhubung
                  </h1>
                  <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Akun login Anda berhasil diautentikasi, namun belum ditautkan ke data nama staf
                    pada master direktori karyawan Menara Nobu.
                  </p>
                </div>
              </div>

              {/* Email Box & Salin */}
              <div className="rounded-xl sm:rounded-2xl border border-border bg-muted/40 p-3.5 sm:p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Email Akun Anda:
                </p>
                <div className="mt-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <span className="font-mono text-xs sm:text-base font-bold text-foreground break-all">
                    {user.email}
                  </span>
                  <button
                    type="button"
                    onClick={copyEmailToClipboard}
                    className="w-full sm:w-auto inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-card border border-border px-3.5 py-1.5 text-xs font-bold text-foreground hover:bg-brand-soft hover:text-primary transition-all active:scale-95 shadow-sm"
                  >
                    {copiedEmail ? (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    <span>{copiedEmail ? "Tersalin!" : "Salin Email"}</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons: Full Width di Mobile */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => checkEmployeeLink(true)}
                  disabled={checkingLink}
                  className="w-full sm:w-auto flex-1 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 font-display font-bold text-xs sm:text-sm text-primary-foreground shadow-sm transition-all hover:brightness-110 active:scale-95 disabled:opacity-60"
                >
                  <RefreshCw className={`h-4 w-4 ${checkingLink ? "animate-spin" : ""}`} />
                  <span>
                    {checkingLink ? "Memeriksa Sambungan..." : "Cek Ulang Status Sambungan"}
                  </span>
                </button>

                <a
                  href={`https://wa.me/?text=${waMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 px-4 text-xs sm:text-sm font-semibold transition-all active:scale-95"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Hubungi Admin (WhatsApp)</span>
                </a>

                <a
                  href={`mailto:?subject=${mailtoSubject}&body=${mailtoBody}`}
                  className="w-full sm:w-auto inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-xs sm:text-sm font-semibold text-foreground hover:bg-muted transition-all active:scale-95"
                >
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>Kirim Email</span>
                </a>
              </div>

              {/* Panduan Langkah Singkat */}
              <div className="rounded-xl sm:rounded-2xl border border-border/80 bg-background p-4 sm:p-5">
                <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <HelpCircle className="h-4 w-4 text-primary" />
                  Cara Menghubungkan Akun Anda:
                </p>
                <ol className="mt-3 space-y-2.5 text-xs text-muted-foreground">
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-bold text-primary">
                      1
                    </span>
                    <span>
                      Salin email Anda di atas dan sampaikan ke{" "}
                      <b>Administrator / HRD Menara Nobu</b>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-bold text-primary">
                      2
                    </span>
                    <span>
                      Administrator akan membuka menu <b>Admin &rarr; Data Karyawan</b>, mengedit
                      nama Anda, dan mengisi kolom <b>Email Resmi</b> dengan email tersebut.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-bold text-primary">
                      3
                    </span>
                    <span>
                      Setelah admin menyimpan, tekan tombol <b>"Cek Ulang Status Sambungan"</b> di
                      atas tanpa perlu logout.
                    </span>
                  </li>
                </ol>

                <div className="mt-4 pt-3.5 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="text-muted-foreground">
                    <span>Anda memiliki akses admin? </span>
                    <Link
                      to="/admin/karyawan"
                      className="font-bold text-primary hover:underline inline-flex items-center gap-1"
                    >
                      Buka Menu Master Karyawan <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                  <button
                    type="button"
                    onClick={() => supabase.auth.signOut()}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-destructive py-1"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Keluar & Ganti Akun</span>
                  </button>
                </div>
              </div>
            </div>
          )
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
