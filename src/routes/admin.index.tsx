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
import { BarChart3, Calendar, Clock, UserPlus, Users, TrendingUp } from "lucide-react";
import { supabase, type Guest } from "@/lib/supabase";

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
  const [days, setDays] = useState(7);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

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
        .order("check_in_time")
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

    // Perhitungan rata-rata waktu isi yang masuk akal:
    // Formulir registrasi hanya 5 isian dasar (waktu isi normal: 20 detik s/d 3-5 menit).
    // Nilai puluhan atau ratusan menit terjadi jika tab ditinggal atau draft auto-save disimpan kemarin.
    // 1. Ambil durasi pengisian aktif wajar (10 detik s/d 360 detik / 6 menit).
    const validDurs = rawDurs.filter((d) => d >= 10 && d <= 360);

    let calculatedAvg: number | null = null;
    if (validDurs.length > 0) {
      // Rata-rata dari durasi sesi pengisian aktif
      calculatedAvg = Math.round(validDurs.reduce((a, b) => a + b, 0) / validDurs.length);
    } else if (rawDurs.length > 0) {
      // Normalisasi pelindung jika hanya ada data lama yang membengkak karena bug auto-save sebelumnya
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">
            {greeting()}
            {name ? `, ${name}` : ""} 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            Berikut ringkasan kunjungan tamu Menara Nobu.
          </p>
        </div>
        <div className="flex w-fit shrink-0 rounded-full bg-card p-1 shadow-soft">
          {periods.map((p) => (
            <button
              key={p.d}
              onClick={() => setDays(p.d)}
              className={`rounded-full px-3 py-1.5 text-sm transition-colors ${days === p.d ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              {p.l}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <DashboardLoadingSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Card
              icon={<Users className="h-4 w-4" />}
              t="Tamu hari ini"
              v={stats.todayCount}
              sub={
                stats.todayCount > 0 ? "Kunjungan aktif tercatat" : "Belum ada kunjungan hari ini"
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
              sub={stats.busiest ? `${stats.busiest[1]} tamu pada jam ini` : "Belum ada data jam"}
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
              sub={stats.avg != null ? "Durasi aktif pengisian formulir" : "Menunggu data formulir"}
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
                    Perluas periode untuk melihat riwayat sebelumnya atau buka formulir registrasi.
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
        </>
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
