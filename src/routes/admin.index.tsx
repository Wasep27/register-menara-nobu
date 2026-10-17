import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  BarChart3,
  Calendar,
  Clock,
  IdCard,
  Lock,
  MessageSquareHeart,
  QrCode,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { supabase, type Guest } from "@/lib/supabase";
import { useAdminRole } from "@/routes/admin";
import { VisitorBadgeModal, type VisitorBadgeData } from "@/components/VisitorBadgeModal";

export const Route = createFileRoute("/admin/")({ component: Dashboard });

const periods = [
  { d: 7, l: "7 hari" },
  { d: 30, l: "30 hari" },
  { d: 90, l: "90 hari" },
];
const PRIMARY = "var(--primary)";
const BRAND = "var(--brand)";

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 19) return "Selamat sore";
  return "Selamat malam";
}

function Dashboard() {
  const { isAdmin, isSecurity, isStaff } = useAdminRole();
  const [days, setDays] = useState(7);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [badgeGuest, setBadgeGuest] = useState<VisitorBadgeData | null>(null);

  // Jam Real-Time Indonesia (WIB - Asia/Jakarta)
  const [clock, setClock] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeFormatted = useMemo(() => {
    return clock.toLocaleTimeString("id-ID", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  }, [clock]);

  const dateFormatted = useMemo(() => {
    return clock.toLocaleDateString("id-ID", {
      timeZone: "Asia/Jakarta",
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  }, [clock]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", data.user.id)
        .maybeSingle();
      setName(prof?.full_name || data.user.email?.split("@")[0] || "");
    });
  }, []);

  const [rows, setRows] = useState<Guest[]>([]);
  const [prevCount, setPrevCount] = useState(0);

  useEffect(() => {
    setLoading(true);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));
    const prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - days);
    Promise.all([
      supabase
        .from("guests")
        .select("*, employees(name), visit_purposes(name)")
        .gte("check_in_time", start.toISOString())
        .order("check_in_time", { ascending: false })
        .limit(5000)
        .then(({ data }) => setRows((data as Guest[]) ?? [])),
      supabase
        .from("guests")
        .select("id", { count: "exact", head: true })
        .gte("check_in_time", prevStart.toISOString())
        .lt("check_in_time", start.toISOString())
        .then(({ count }) => setPrevCount(count ?? 0)),
    ]).finally(() => setLoading(false));
  }, [days]);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const perDay = new Map<string, number>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      perDay.set(d.toDateString(), 0);
    }
    const purpose: Record<string, number> = {};
    const emp: Record<string, number> = {};
    const hour: Record<number, number> = {};
    let todayCount = 0;
    const rawDurs: number[] = [];

    rows.forEach((r) => {
      const dt = new Date(r.check_in_time);
      const k = dt.toDateString();
      perDay.set(k, (perDay.get(k) ?? 0) + 1);
      if (k === today) todayCount++;
      const p = r.visit_purposes?.name ?? "Lainnya";
      purpose[p] = (purpose[p] ?? 0) + 1;
      const e = r.employees?.name ?? "-";
      emp[e] = (emp[e] ?? 0) + 1;
      hour[dt.getHours()] = (hour[dt.getHours()] ?? 0) + 1;
      if (r.fill_duration_seconds != null && r.fill_duration_seconds > 0) {
        rawDurs.push(r.fill_duration_seconds);
      }
    });

    const validDurs = rawDurs.filter((d) => d >= 10 && d <= 360);
    let calculatedAvg: number | null = null;
    if (validDurs.length > 0) {
      calculatedAvg = Math.round(validDurs.reduce((a, b) => a + b, 0) / validDurs.length);
    } else if (rawDurs.length > 0) {
      const normalizedDurs = rawDurs.map((d) => Math.min(Math.max(d, 15), 120));
      calculatedAvg = Math.round(normalizedDurs.reduce((a, b) => a + b, 0) / normalizedDurs.length);
    }

    const busiest = Object.entries(hour).sort((a, b) => b[1] - a[1])[0];
    const toArr = (o: Record<string, number>) =>
      Object.entries(o)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    return {
      todayCount,
      busiest,
      avg: calculatedAvg,
      trend: [...perDay.entries()].map(([k, v]) => ({
        name: new Date(k).toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
        value: v,
      })),
      purpose: toArr(purpose),
      emp: toArr(emp).slice(0, 8),
    };
  }, [rows, days]);

  const diff = prevCount ? Math.round(((rows.length - prevCount) / prevCount) * 100) : null;

  const roleTitle = isSecurity
    ? "Pos Jaga & Keamanan Gedung"
    : isStaff
      ? "Front Desk & Resepsionis Lobi"
      : "Super Admin Menara Nobu";

  const roleDesc = isSecurity
    ? "Pantau kedatangan tamu, validasi tiket & badge pass, dan periksa direktori host penerima."
    : isStaff
      ? "Layanan penerimaan tamu gedung, pendaftaran walk-in, cetak kartu akses, dan feedback pengunjung."
      : "Ikhtisar lengkap analitik kunjungan, direktori master, dan sistem keamanan Menara Nobu.";

  const openBadgeForGuest = (r: Guest) => {
    setBadgeGuest({
      id: r.id,
      name: r.name,
      institution: r.institution,
      phone: r.phone,
      employeeName: r.employees?.name ?? undefined,
      purposeName: r.visit_purposes?.name ?? undefined,
      checkInTime: new Date(r.check_in_time).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      checkInDate: new Date(r.check_in_time).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      badgeNumber: r.badge_code || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Header Adapts to Role */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="flex items-center gap-1.5 text-xl font-bold tracking-tight text-foreground sm:text-2xl min-w-0 max-w-full overflow-hidden whitespace-nowrap">
              <span className="shrink-0">{greeting()},</span>
              {name ? (
                <span
                  className="truncate min-w-0 flex-1 max-w-[140px] sm:max-w-xs md:max-w-md inline-block font-extrabold"
                  title={name}
                >
                  {name}
                </span>
              ) : null}
              <span className="shrink-0 text-lg sm:text-xl">👋</span>
            </h1>
            {isSecurity && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
                <ShieldCheck className="h-3.5 w-3.5" /> Pos Keamanan
              </span>
            )}
            {isStaff && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-400 shrink-0">
                <UserCheck className="h-3.5 w-3.5" /> Front Desk
              </span>
            )}
            {isAdmin && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-bold text-primary shrink-0">
                <ShieldCheck className="h-3.5 w-3.5" /> Super Admin
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">{roleDesc}</p>
        </div>

        {/* Real-time Clock and (for non-security) Period Selector */}
        <div className="flex w-full sm:w-auto items-center justify-between sm:justify-end gap-1.5 min-[380px]:gap-2 sm:gap-2.5 flex-nowrap shrink-0">
          {/* Jam Real-time Indonesia (WIB) */}
          <div
            title="Waktu Real-time Indonesia Barat (WIB)"
            className="flex flex-1 sm:flex-initial items-center gap-1.5 sm:gap-2 rounded-full border border-border/80 bg-card px-2.5 sm:px-3.5 py-1.5 shadow-soft transition-all hover:border-primary/40 min-w-0"
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
            <div className="flex items-center gap-1 sm:gap-1.5 text-xs font-semibold text-foreground truncate min-w-0">
              <span className="text-muted-foreground hidden lg:inline">{dateFormatted} ·</span>
              <span className="font-mono tabular-nums text-foreground tracking-tight">
                {timeFormatted}
              </span>
              <span className="rounded bg-brand-soft px-1 py-0.5 text-[9px] min-[380px]:text-[10px] font-bold text-primary shrink-0 leading-none">
                WIB
              </span>
            </div>
          </div>

          {/* Filter Periode — hanya untuk Admin dan Staff (sembunyikan dari Security) */}
          {!isSecurity && (
            <div className="flex shrink-0 items-center rounded-full bg-card p-1 shadow-soft border border-border/60">
              {periods.map((p) => (
                <button
                  key={p.d}
                  onClick={() => setDays(p.d)}
                  className={`rounded-full px-2 min-[380px]:px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] min-[380px]:text-xs sm:text-sm font-semibold transition-all active:scale-95 whitespace-nowrap ${
                    days === p.d
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p.l}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <DashboardLoadingSkeleton />
      ) : (
        <>
          {/* ========================================================= */}
          {/* 1. VIEW KHUSUS ROLE SECURITY (POS KEAMANAN & SATPAM)     */}
          {/* ========================================================= */}
          {isSecurity && (
            <div className="space-y-6">
              {/* Security Post Banner & Quick Action Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <Link
                  to="/admin/scan"
                  className="group flex flex-col justify-between rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-brand-soft/90 to-card p-4 shadow-soft transition-all hover:border-primary hover:shadow-md active:scale-[0.99]"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs group-hover:scale-105 transition-transform">
                      <QrCode className="h-5 w-5" />
                    </span>
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                      Aksi Utama
                    </span>
                  </div>
                  <div className="mt-3">
                    <h3 className="font-display font-bold text-foreground text-base group-hover:text-primary transition-colors">
                      Buka Pos Pindai Pass
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Pindai QR code & barcode kartu pengunjung via kamera atau barcode reader
                    </p>
                  </div>
                  <div className="mt-4 flex items-center text-xs font-bold text-primary">
                    Buka Scanner &rarr;
                  </div>
                </Link>

                <Link
                  to="/admin/tamu"
                  className="group flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-4 shadow-soft transition-all hover:border-primary/50 hover:shadow-md active:scale-[0.99]"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 shadow-xs">
                      <Users className="h-5 w-5" />
                    </span>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                      Hari Ini
                    </span>
                  </div>
                  <div className="mt-3">
                    <h3 className="font-display font-bold text-foreground text-base group-hover:text-primary transition-colors">
                      Daftar Tamu Masuk
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Cek daftar seluruh pengunjung yang telah check-in & cetak kartu akses
                    </p>
                  </div>
                  <div className="mt-4 flex items-center text-xs font-bold text-primary">
                    Lihat Data Tamu &rarr;
                  </div>
                </Link>

                <Link
                  to="/admin/karyawan"
                  className="group flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-4 shadow-soft transition-all hover:border-primary/50 hover:shadow-md active:scale-[0.99]"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-foreground shadow-xs">
                      <UserCheck className="h-5 w-5" />
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      Direktori
                    </span>
                  </div>
                  <div className="mt-3">
                    <h3 className="font-display font-bold text-foreground text-base group-hover:text-primary transition-colors">
                      Direktori Host / Karyawan
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Cari nama staf, unit kerja, & kontak untuk konfirmasi pengunjung tiba
                    </p>
                  </div>
                  <div className="mt-4 flex items-center text-xs font-bold text-primary">
                    Cari Host &rarr;
                  </div>
                </Link>
              </div>

              {/* Security KPI Row */}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Card
                  icon={<Users className="h-4 w-4" />}
                  t="Tamu hari ini"
                  v={stats.todayCount}
                  sub="Pengunjung tercatat hari ini"
                />
                <Card
                  icon={<QrCode className="h-4 w-4" />}
                  t="Status pos verifikasi"
                  v="Siap Pindai"
                  sub="Kamera & reader aktif"
                />
                <Card
                  icon={<Clock className="h-4 w-4" />}
                  t="Jam sibuk hari ini"
                  v={stats.busiest ? `${stats.busiest[0]}:00` : "-"}
                  sub={
                    stats.busiest ? `${stats.busiest[1]} tamu tiba pada jam ini` : "Belum ada data"
                  }
                />
                <Card
                  icon={<ShieldCheck className="h-4 w-4" />}
                  t="Jam jaga lobi"
                  v="07:00 - 18:00"
                  sub="Standar operasional gedung"
                />
              </div>

              {/* Real-time Guest Feed for Security Verification */}
              <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold">
                      <ShieldCheck className="h-4 w-4" />
                    </span>
                    <div>
                      <h2 className="font-display text-base font-bold text-foreground">
                        Tamu Masuk Terkini (Pos Keamanan)
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Daftar pengunjung terbaru yang telah melakukan check-in di gedung
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/admin/tamu"
                    className="inline-flex items-center gap-1 self-start sm:self-auto rounded-lg bg-brand-soft px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                  >
                    Buka Buku Tamu Lengkap &rarr;
                  </Link>
                </div>

                <div className="mt-3.5 space-y-2.5">
                  {rows.slice(0, 6).map((r) => (
                    <div
                      key={r.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-border/60 bg-muted/20 p-3 text-xs hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-soft font-bold text-primary text-xs">
                          {r.name.slice(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <p className="font-bold text-foreground text-sm leading-tight">
                            {r.name}
                            <span className="ml-1.5 font-normal text-muted-foreground text-xs">
                              ({r.institution})
                            </span>
                          </p>
                          <p className="text-muted-foreground text-xs mt-0.5">
                            Menemui:{" "}
                            <strong className="text-foreground">{r.employees?.name ?? "-"}</strong>{" "}
                            · Keperluan: {r.visit_purposes?.name ?? "-"}
                            {r.badge_code && (
                              <span className="ml-2 font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                {r.badge_code}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                        <span className="text-muted-foreground text-[11px]">
                          {new Date(r.check_in_time).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          WIB
                        </span>
                        <button
                          type="button"
                          onClick={() => openBadgeForGuest(r)}
                          className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-card px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-colors active:scale-95 shadow-2xs"
                        >
                          <IdCard className="h-3.5 w-3.5" />
                          <span>Cek Badge</span>
                        </button>
                      </div>
                    </div>
                  ))}

                  {rows.length === 0 && (
                    <p className="py-8 text-center text-xs text-muted-foreground">
                      Belum ada catatan pengunjung pada hari ini.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 2. VIEW KHUSUS ROLE STAFF (FRONT DESK & RESEPSIONIS)       */}
          {/* ========================================================= */}
          {isStaff && (
            <div className="space-y-6">
              {/* Staff Front Desk Quick Action Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Link
                  to="/registrasi"
                  className="group flex flex-col justify-between rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-brand-soft to-card p-3.5 shadow-soft transition-all hover:border-primary active:scale-95"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
                      <UserPlus className="h-4 w-4" />
                    </span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      Registrasi
                    </span>
                  </div>
                  <div className="mt-3">
                    <h3 className="font-display font-bold text-foreground text-sm group-hover:text-primary transition-colors">
                      + Tamu Walk-in
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Daftarkan tamu yang datang langsung ke meja lobi
                    </p>
                  </div>
                </Link>

                <Link
                  to="/admin/tamu"
                  className="group flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-3.5 shadow-soft transition-all hover:border-primary/40 active:scale-95"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-primary shadow-xs">
                      <Users className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="mt-3">
                    <h3 className="font-display font-bold text-foreground text-sm group-hover:text-primary transition-colors">
                      Buku Tamu Lobi
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Kelola daftar hadir & cetak kartu badge tamu
                    </p>
                  </div>
                </Link>

                <Link
                  to="/admin/scan"
                  className="group flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-3.5 shadow-soft transition-all hover:border-primary/40 active:scale-95"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-foreground shadow-xs">
                      <QrCode className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="mt-3">
                    <h3 className="font-display font-bold text-foreground text-sm group-hover:text-primary transition-colors">
                      Pindai Pass Undangan
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Verifikasi barcode tamu yang sudah reservasi
                    </p>
                  </div>
                </Link>

                <Link
                  to="/admin/feedback"
                  className="group flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-3.5 shadow-soft transition-all hover:border-primary/40 active:scale-95"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400 shadow-xs">
                      <MessageSquareHeart className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="mt-3">
                    <h3 className="font-display font-bold text-foreground text-sm group-hover:text-primary transition-colors">
                      Feedback Tamu
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Ulasan & indeks kepuasan pengunjung lobi
                    </p>
                  </div>
                </Link>
              </div>

              {/* Staff KPI Row */}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Card
                  icon={<Users className="h-4 w-4" />}
                  t="Tamu hari ini"
                  v={stats.todayCount}
                  sub="Check-in aktif di lobi"
                />
                <Card
                  icon={<Calendar className="h-4 w-4" />}
                  t={`Total ${days} hari`}
                  v={rows.length}
                  sub={
                    diff != null
                      ? `${diff >= 0 ? "▲" : "▼"} ${Math.abs(diff)}% vs periode lalu`
                      : `Periode ${days} hari`
                  }
                />
                <Card
                  icon={<Clock className="h-4 w-4" />}
                  t="Jam tersibuk"
                  v={stats.busiest ? `${stats.busiest[0]}:00` : "-"}
                  sub={stats.busiest ? `${stats.busiest[1]} tamu pada jam ini` : "Menunggu data"}
                />
                <Card
                  icon={<TrendingUp className="h-4 w-4" />}
                  t="Rata-rata waktu isi"
                  v={
                    stats.avg != null
                      ? stats.avg >= 60
                        ? `${Math.floor(stats.avg / 60)} mnt ${stats.avg % 60} dtk`
                        : `${stats.avg} dtk`
                      : "-"
                  }
                  sub="Durasi pengisian tamu"
                />
              </div>

              {/* Charts for Staff */}
              <div className="grid gap-6 lg:grid-cols-2">
                <Panel title="Tren Kunjungan Harian Lobi">
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={stats.trend} margin={{ left: -20, right: 8 }}>
                      <defs>
                        <linearGradient id="g-staff" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={BRAND} stopOpacity={0.5} />
                          <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="value"
                        name="Tamu"
                        stroke={PRIMARY}
                        strokeWidth={2}
                        fill="url(#g-staff)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Panel>

                <Panel title="Kunjungan Berdasarkan Tujuan">
                  <HBar
                    data={stats.purpose}
                    color={PRIMARY}
                    emptyTitle="Belum ada data tujuan"
                    emptyDesc="Grafik akan terisi otomatis saat tamu memilih tujuan kunjungan."
                  />
                </Panel>
              </div>

              {/* Real-time guest list with direct badge print */}
              <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-soft text-primary shadow-sm font-bold">
                      <Users className="h-4 w-4" />
                    </span>
                    <div>
                      <h2 className="font-display text-base font-bold text-foreground">
                        Tamu Masuk Terkini di Lobi
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Kedatangan tamu terbaru yang memerlukan cetak badge atau verifikasi
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/admin/tamu"
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                  >
                    Buka Buku Tamu &rarr;
                  </Link>
                </div>

                <div className="mt-3.5 space-y-2.5">
                  {rows.slice(0, 5).map((r) => (
                    <div
                      key={r.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-border/60 bg-muted/20 p-3 text-xs hover:border-primary/40 transition-colors"
                    >
                      <div>
                        <p className="font-bold text-foreground text-sm">
                          {r.name}
                          <span className="ml-1.5 font-normal text-muted-foreground text-xs">
                            ({r.institution})
                          </span>
                        </p>
                        <p className="text-muted-foreground text-xs mt-0.5">
                          Menemui:{" "}
                          <strong className="text-foreground">{r.employees?.name ?? "-"}</strong> ·
                          Keperluan: {r.visit_purposes?.name ?? "-"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-muted-foreground text-[11px]">
                          {new Date(r.check_in_time).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          WIB
                        </span>
                        <button
                          type="button"
                          onClick={() => openBadgeForGuest(r)}
                          className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-card px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-colors active:scale-95 shadow-2xs"
                        >
                          <IdCard className="h-3.5 w-3.5" />
                          <span>Cetak Badge</span>
                        </button>
                      </div>
                    </div>
                  ))}
                  {rows.length === 0 && (
                    <p className="py-6 text-center text-xs text-muted-foreground">
                      Belum ada data kunjungan terbaru pada periode ini.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 3. VIEW SUPER ADMIN (FULL ANALYTICS, CRUD & AUDIT LOGS)   */}
          {/* ========================================================= */}
          {isAdmin && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Card
                  icon={<Users className="h-4 w-4" />}
                  t="Tamu hari ini"
                  v={stats.todayCount}
                  sub={
                    stats.todayCount > 0
                      ? "Kunjungan aktif tercatat"
                      : "Belum ada kunjungan hari ini"
                  }
                />
                <Card
                  icon={<Calendar className="h-4 w-4" />}
                  t={`Total ${days} hari`}
                  v={rows.length}
                  sub={
                    diff != null
                      ? `${diff >= 0 ? "▲" : "▼"} ${Math.abs(diff)}% vs periode lalu`
                      : rows.length > 0
                        ? `Periode ${days} hari terakhir`
                        : "Belum ada kunjungan"
                  }
                />
                <Card
                  icon={<Clock className="h-4 w-4" />}
                  t="Jam tersibuk"
                  v={stats.busiest ? `${stats.busiest[0]}:00` : "-"}
                  sub={
                    stats.busiest ? `${stats.busiest[1]} tamu pada jam ini` : "Belum ada data jam"
                  }
                />
                <Card
                  icon={<TrendingUp className="h-4 w-4" />}
                  t="Rata-rata waktu isi"
                  v={
                    stats.avg != null
                      ? stats.avg >= 60
                        ? `${Math.floor(stats.avg / 60)} mnt ${stats.avg % 60} dtk`
                        : `${stats.avg} dtk`
                      : "-"
                  }
                  sub={
                    stats.avg != null ? "Durasi aktif pengisian formulir" : "Menunggu data formulir"
                  }
                />
              </div>

              {rows.length === 0 && (
                <div className="fade-up flex flex-col items-center justify-between gap-4 rounded-2xl border border-dashed border-border bg-card p-5 shadow-soft sm:flex-row">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-primary shadow-sm">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        Belum ada kunjungan tercatat dalam {days} hari terakhir
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Perluas periode untuk melihat riwayat sebelumnya atau buka formulir
                        registrasi.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {days !== 30 && (
                      <button
                        onClick={() => setDays(30)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-brand-soft hover:text-primary"
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        Cek 30 Hari
                      </button>
                    )}
                    {days !== 90 && (
                      <button
                        onClick={() => setDays(90)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-brand-soft hover:text-primary"
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        Cek 90 Hari
                      </button>
                    )}
                    <Link
                      to="/registrasi"
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground transition-transform hover:brightness-110 active:scale-95"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Buka Registrasi
                    </Link>
                  </div>
                </div>
              )}

              <Panel title="Kunjungan per hari">
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={stats.trend} margin={{ left: -20, right: 8 }}>
                    <defs>
                      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={BRAND} stopOpacity={0.5} />
                        <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="value"
                      name="Tamu"
                      stroke={PRIMARY}
                      strokeWidth={2}
                      fill="url(#g)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Panel>

              <div className="grid gap-6 lg:grid-cols-2">
                <Panel title="Berdasarkan tujuan">
                  <HBar
                    data={stats.purpose}
                    color={PRIMARY}
                    emptyTitle="Belum ada data tujuan kunjungan"
                    emptyDesc="Grafik akan terisi otomatis setelah ada tamu yang memilih tujuan kunjungan."
                    onAction={days !== 30 ? () => setDays(30) : undefined}
                    actionLabel="Lihat 30 hari"
                  />
                </Panel>
                <Panel title="Karyawan paling banyak dikunjungi">
                  <HBar
                    data={stats.emp}
                    color={BRAND}
                    emptyTitle="Belum ada data karyawan dikunjungi"
                    emptyDesc="Grafik akan menampilkan karyawan penerima tamu paling sering dikunjungi."
                    onAction={days !== 30 ? () => setDays(30) : undefined}
                    actionLabel="Lihat 30 hari"
                  />
                </Panel>
              </div>

              {/* Aktivitas Terkini (Live Feed Preview) */}
              <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-soft text-primary shadow-sm">
                      <Activity className="h-4 w-4" />
                    </span>
                    <div>
                      <h2 className="font-display text-sm font-bold text-foreground sm:text-base">
                        Aktivitas & Registrasi Terkini (Real-Time)
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Kejadian dan kedatangan tamu terbaru di lobi Menara Nobu
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/admin/aktivitas"
                    className="inline-flex items-center gap-1 self-start sm:self-auto rounded-lg bg-brand-soft px-3 py-1.5 text-xs font-bold text-primary transition-all hover:bg-primary hover:text-primary-foreground active:scale-95"
                  >
                    Buka Log Aktivitas Lengkap
                    <span aria-hidden>&rarr;</span>
                  </Link>
                </div>

                <div className="mt-3.5 space-y-2.5">
                  {rows.slice(0, 4).map((r) => (
                    <div
                      key={r.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 rounded-xl border border-border/60 bg-background/60 p-3 text-xs transition-colors hover:border-brand/40"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-primary">
                          ✓
                        </span>
                        <div>
                          <p className="font-bold text-foreground">
                            {r.name}
                            <span className="ml-1.5 font-normal text-muted-foreground">
                              ({r.institution})
                            </span>
                          </p>
                          <p className="text-muted-foreground">
                            Menemui:{" "}
                            <span className="font-semibold text-primary">
                              {r.employees?.name ?? "-"}
                            </span>{" "}
                            · Keperluan: {r.visit_purposes?.name ?? "-"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground self-start sm:self-auto whitespace-nowrap text-[11px]">
                          {new Date(r.check_in_time).toLocaleString("id-ID", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          WIB
                        </span>
                        <button
                          type="button"
                          onClick={() => openBadgeForGuest(r)}
                          className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-card px-2 py-0.5 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          <IdCard className="h-3 w-3" />
                          Badge
                        </button>
                      </div>
                    </div>
                  ))}

                  {rows.length === 0 && (
                    <p className="py-4 text-center text-xs text-muted-foreground">
                      Belum ada catatan aktivitas tamu pada periode ini.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Visitor Badge Modal Trigger */}
      {badgeGuest && (
        <VisitorBadgeModal
          open={!!badgeGuest}
          onClose={() => setBadgeGuest(null)}
          data={badgeGuest}
        />
      )}
    </div>
  );
}

function DashboardLoadingSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Memuat data dashboard">
      {/* 4 Kartu KPI Skeleton Responsif */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((k) => (
          <div key={k} className="rounded-2xl bg-card p-4 shadow-soft">
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 rounded-full skeleton-shimmer" />
              <div className="h-6 w-6 rounded-lg skeleton-shimmer opacity-80" />
            </div>
            <div className="mt-3 h-8 w-24 rounded-lg skeleton-shimmer" />
            <div className="mt-2.5 h-2.5 w-32 rounded-full skeleton-shimmer opacity-60" />
          </div>
        ))}
      </div>

      {/* Skeleton Grafik Utama Kunjungan */}
      <div className="rounded-2xl bg-card p-5 shadow-soft">
        <div className="mb-4 flex items-center justify-between">
          <div className="h-4 w-36 rounded-full skeleton-shimmer" />
          <div className="h-3 w-24 rounded-full skeleton-shimmer opacity-60" />
        </div>
        <div className="relative flex h-56 w-full items-end gap-2 overflow-hidden rounded-xl border border-dashed border-border/60 bg-muted/20 p-4">
          <div className="absolute inset-0 skeleton-shimmer opacity-20" />
          {[40, 65, 30, 85, 50, 95, 60, 45, 75, 55, 70, 80].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-lg bg-primary/20 transition-all"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>

      {/* 2 Panel Rincian Bar Skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        {[0, 1].map((p) => (
          <div key={p} className="rounded-2xl bg-card p-5 shadow-soft">
            <div className="mb-4 h-4 w-40 rounded-full skeleton-shimmer" />
            <div className="space-y-3">
              {[85, 65, 50, 35].map((w, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <div className="h-3 w-24 rounded-full skeleton-shimmer" />
                    <div className="h-3 w-8 rounded-full skeleton-shimmer opacity-60" />
                  </div>
                  <div className="h-6 w-full overflow-hidden rounded-lg bg-muted/40">
                    <div
                      className="h-full rounded-r-lg skeleton-shimmer opacity-75"
                      style={{ width: `${w}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HBar({
  data,
  color,
  emptyTitle = "Belum ada data",
  emptyDesc = "Data grafik akan muncul setelah ada kunjungan tamu pada periode ini.",
  onAction,
  actionLabel = "Lihat periode lain",
}: {
  data: { name: string; value: number }[];
  color: string;
  emptyTitle?: string;
  emptyDesc?: string;
  onAction?: () => void;
  actionLabel?: string;
}) {
  if (!data.length)
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft text-primary shadow-sm">
          <BarChart3 className="h-5 w-5" />
        </div>
        <p className="mt-3 text-sm font-semibold text-foreground">{emptyTitle}</p>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">{emptyDesc}</p>
        {onAction && (
          <button
            onClick={onAction}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3.5 py-1.5 text-xs font-semibold text-primary transition-all hover:bg-primary hover:text-primary-foreground active:scale-95"
          >
            <Calendar className="h-3.5 w-3.5" />
            {actionLabel}
          </button>
        )}
      </div>
    );
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 40)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="value" name="Tamu" fill={color} radius={[0, 8, 8, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-card p-5 shadow-soft">
      <h2 className="mb-3 font-semibold text-foreground">{title}</h2>
      {children}
    </div>
  );
}

function Card({
  t,
  v,
  sub,
  icon,
}: {
  t: string;
  v: string | number;
  sub?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground sm:text-sm">{t}</p>
        {icon && <div className="text-primary/70">{icon}</div>}
      </div>
      <p className="mt-1 font-display text-2xl font-extrabold text-primary sm:text-3xl">{v}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
