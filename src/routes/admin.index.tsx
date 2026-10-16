import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase, type Guest } from "@/lib/supabase";

export const Route = createFileRoute("/admin/")({ component: Dashboard });

function Dashboard() {
  const [rows, setRows] = useState<Guest[]>([]);
  useEffect(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    supabase.from("guests").select("*, visit_purposes(name)").gte("check_in_time", start.toISOString()).then(({ data }) => setRows((data as Guest[]) ?? []));
  }, []);
  const byPurpose: Record<string, number> = {};
  const byHour: Record<number, number> = {};
  rows.forEach((r) => {
    const p = r.visit_purposes?.name ?? "-";
    byPurpose[p] = (byPurpose[p] ?? 0) + 1;
    const h = new Date(r.check_in_time).getHours();
    byHour[h] = (byHour[h] ?? 0) + 1;
  });
  const busiest = Object.entries(byHour).sort((a, b) => b[1] - a[1])[0];
  const durs = rows.map((r) => r.fill_duration_seconds).filter((x): x is number => x != null);
  const avg = durs.length ? Math.round(durs.reduce((a, b) => a + b, 0) / durs.length) : null;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Ringkasan Hari Ini</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Card t="Tamu hari ini" v={rows.length} />
        <Card t="Jam tersibuk" v={busiest ? `${busiest[0]}:00 (${busiest[1]})` : "-"} />
        <Card t="Rata-rata waktu isi" v={avg != null ? `${avg} detik` : "-"} />
      </div>
      <div className="rounded-xl bg-card p-5">
        <h2 className="mb-3 font-semibold text-foreground">Per tujuan</h2>
        {Object.keys(byPurpose).length === 0 && <p className="text-muted-foreground">Belum ada tamu hari ini.</p>}
        {Object.entries(byPurpose).map(([k, v]) => (
          <div key={k} className="mb-2">
            <div className="flex justify-between text-sm"><span>{k}</span><span>{v}</span></div>
            <div className="h-2 rounded bg-muted"><div className="h-2 rounded bg-primary" style={{ width: `${(v / rows.length) * 100}%` }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
function Card({ t, v }: { t: string; v: string | number }) {
  return <div className="rounded-xl bg-card p-5"><p className="text-sm text-muted-foreground">{t}</p><p className="mt-1 text-3xl font-bold text-primary">{v}</p></div>;
}
