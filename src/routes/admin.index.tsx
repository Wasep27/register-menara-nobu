import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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
      const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", data.user.id).maybeSingle();
      setName(prof?.full_name || data.user.email?.split("@")[0] || "");
    });
  }, []);
  const [rows, setRows] = useState<Guest[]>([]);
  const [prevCount, setPrevCount] = useState(0);

  useEffect(() => {
    setLoading(true);
    const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - (days - 1));
    const prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - days);
    Promise.all([
      supabase.from("guests").select("*, employees(name), visit_purposes(name)").gte("check_in_time", start.toISOString()).order("check_in_time").limit(5000)
        .then(({ data }) => setRows((data as Guest[]) ?? [])),
      supabase.from("guests").select("id", { count: "exact", head: true }).gte("check_in_time", prevStart.toISOString()).lt("check_in_time", start.toISOString())
        .then(({ count }) => setPrevCount(count ?? 0)),
    ]).finally(() => setLoading(false));
  }, [days]);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const perDay = new Map<string, number>();
    for (let i = days - 1; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); perDay.set(d.toDateString(), 0); }
    const purpose: Record<string, number> = {};
    const emp: Record<string, number> = {};
    const hour: Record<number, number> = {};
    let todayCount = 0;
    const durs: number[] = [];
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
      // abaikan durasi tidak wajar (> 30 menit = formulir ditinggal)
      if (r.fill_duration_seconds != null && r.fill_duration_seconds <= 1800) durs.push(r.fill_duration_seconds);
    });
    const busiest = Object.entries(hour).sort((a, b) => b[1] - a[1])[0];
    const toArr = (o: Record<string, number>) => Object.entries(o).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    return {
      todayCount,
      busiest,
      avg: durs.length ? Math.round(durs.reduce((a, b) => a + b, 0) / durs.length) : null,
      trend: [...perDay.entries()].map(([k, v]) => ({ name: new Date(k).toLocaleDateString("id-ID", { day: "numeric", month: "short" }), value: v })),
      purpose: toArr(purpose),
      emp: toArr(emp).slice(0, 8),
    };
  }, [rows, days]);

  const diff = prevCount ? Math.round(((rows.length - prevCount) / prevCount) * 100) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">{greeting()}{name ? `, ${name}` : ""} 👋</h1>
          <p className="text-sm text-muted-foreground">Berikut ringkasan kunjungan tamu Menara Nobu.</p>
        </div>
        <div className="flex w-fit shrink-0 rounded-full bg-card p-1 shadow-soft">
          {periods.map((p) => (
            <button key={p.d} onClick={() => setDays(p.d)} className={`rounded-full px-3 py-1.5 text-sm transition-colors ${days === p.d ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{p.l}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((k) => <Skel key={k} h="h-24" />)}</div>
          <Skel h="h-72" />
          <div className="grid gap-6 lg:grid-cols-2"><Skel h="h-64" /><Skel h="h-64" /></div>
        </>
      ) : (
      <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card t="Tamu hari ini" v={stats.todayCount} />
        <Card t={`Total ${days} hari`} v={rows.length} sub={diff != null ? `${diff >= 0 ? "▲" : "▼"} ${Math.abs(diff)}% vs periode lalu` : "Belum ada pembanding"} />
        <Card t="Jam tersibuk" v={stats.busiest ? `${stats.busiest[0]}:00` : "-"} />
        <Card t="Rata-rata waktu isi" v={stats.avg != null ? (stats.avg >= 60 ? `${Math.floor(stats.avg / 60)} mnt ${stats.avg % 60} dtk` : `${stats.avg} dtk`) : "-"} />
      </div>

      <Panel title="Kunjungan per hari">
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={stats.trend} margin={{ left: -20, right: 8 }}>
            <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={BRAND} stopOpacity={0.5} /><stop offset="100%" stopColor={BRAND} stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Area type="monotone" dataKey="value" name="Tamu" stroke={PRIMARY} strokeWidth={2} fill="url(#g)" />
          </AreaChart>
        </ResponsiveContainer>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Berdasarkan tujuan"><HBar data={stats.purpose} color={PRIMARY} /></Panel>
        <Panel title="Karyawan paling banyak dikunjungi"><HBar data={stats.emp} color={BRAND} /></Panel>
      </div>
      </>
      )}
    </div>
  );
}

function Skel({ h }: { h: string }) {
  return <div aria-hidden className={`${h} animate-pulse rounded-2xl bg-card shadow-soft`} />;
}

function HBar({ data, color }: { data: { name: string; value: number }[]; color: string }) {
  if (!data.length) return <p className="py-8 text-center text-muted-foreground">Belum ada data.</p>;
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
  return <div className="rounded-2xl bg-card p-5 shadow-soft"><h2 className="mb-3 font-semibold text-foreground">{title}</h2>{children}</div>;
}
function Card({ t, v, sub }: { t: string; v: string | number; sub?: string }) {
  return <div className="rounded-2xl bg-card p-4 shadow-soft"><p className="text-xs text-muted-foreground sm:text-sm">{t}</p><p className="mt-1 font-display text-2xl font-extrabold text-primary sm:text-3xl">{v}</p>{sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}</div>;
}
