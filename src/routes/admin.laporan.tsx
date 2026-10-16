import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase, type Guest } from "@/lib/supabase";

export const Route = createFileRoute("/admin/laporan")({ component: Report });

function Report() {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [rows, setRows] = useState<Guest[] | null>(null);
  const load = async () => {
    const e = new Date(to); e.setDate(e.getDate() + 1);
    const { data } = await supabase.from("guests").select("*, employees(name), visit_purposes(name)").gte("check_in_time", new Date(from).toISOString()).lt("check_in_time", e.toISOString()).order("check_in_time");
    setRows((data as Guest[]) ?? []);
  };
  const csv = () => {
    if (!rows) return;
    const esc = (s: unknown) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const lines = [["Waktu", "Nama", "Instansi", "Telepon", "Tujuan", "Dituju", "Catatan", "Durasi isi (detik)"].join(",")];
    rows.forEach((r) => lines.push([new Date(r.check_in_time).toLocaleString("id-ID"), r.name, r.institution, r.phone, r.visit_purposes?.name, r.employees?.name, r.notes, r.fill_duration_seconds].map(esc).join(",")));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    a.download = `laporan-tamu-${from}-${to}.csv`;
    a.click();
  };
  const i = "rounded-lg border border-input bg-card px-3 py-2 text-sm";
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Laporan</h1>
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <input type="date" className={i} value={from} onChange={(e) => setFrom(e.target.value)} />
        <span>s/d</span>
        <input type="date" className={i} value={to} onChange={(e) => setTo(e.target.value)} />
        <button className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground" onClick={load}>Tampilkan</button>
        {rows && <><button className={i} onClick={csv}>Ekspor CSV</button><button className={i} onClick={() => window.print()}>Cetak / PDF</button></>}
      </div>
      {rows && (
        <div className="rounded-xl bg-card p-4">
          <p className="mb-3 text-sm text-muted-foreground">Periode {from} s/d {to} — total {rows.length} tamu</p>
          <table className="w-full text-sm">
            <thead className="text-left"><tr><th className="p-2">Waktu</th><th className="p-2">Nama</th><th className="p-2">Instansi</th><th className="p-2">Tujuan</th><th className="p-2">Dituju</th></tr></thead>
            <tbody>{rows.map((r) => <tr key={r.id} className="border-t border-border"><td className="p-2">{new Date(r.check_in_time).toLocaleString("id-ID")}</td><td className="p-2">{r.name}</td><td className="p-2">{r.institution}</td><td className="p-2">{r.visit_purposes?.name}</td><td className="p-2">{r.employees?.name}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
