import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase, type Employee, type Guest, type Purpose } from "@/lib/supabase";

export const Route = createFileRoute("/admin/tamu")({ component: Guests });
const PAGE = 20;

function Guests() {
  const [rows, setRows] = useState<Guest[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const [date, setDate] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [purpose, setPurpose] = useState("");
  const [emp, setEmp] = useState("");
  const [asc, setAsc] = useState(false);
  const [emps, setEmps] = useState<Employee[]>([]);
  const [purps, setPurps] = useState<Purpose[]>([]);
  const [edit, setEdit] = useState<Guest | null>(null);

  useEffect(() => {
    supabase.from("employees").select("*").order("name").then(({ data }) => setEmps(data ?? []));
    supabase.from("visit_purposes").select("*").order("name").then(({ data }) => setPurps(data ?? []));
  }, []);

  const load = useCallback(async () => {
    let qb = supabase.from("guests").select("*, employees(name), visit_purposes(name)", { count: "exact" });
    const term = q.replace(/[,()%*]/g, " ").trim();
    if (term) qb = qb.or(`name.ilike.%${term}%,institution.ilike.%${term}%,phone.ilike.%${term}%`);
    if (date) qb = qb.gte("check_in_time", new Date(`${date}T00:00:00`).toISOString());
    if (dateTo || date) { const e = new Date(`${dateTo || date}T00:00:00`); e.setDate(e.getDate() + 1); qb = qb.lt("check_in_time", e.toISOString()); }
    if (purpose) qb = qb.eq("visit_purpose_id", purpose);
    if (emp) qb = qb.eq("employee_id", emp);
    const { data, count } = await qb.order("check_in_time", { ascending: asc }).range(page * PAGE, page * PAGE + PAGE - 1);
    setRows((data as Guest[]) ?? []);
    setCount(count ?? 0);
  }, [q, date, dateTo, purpose, emp, asc, page]);
  useEffect(() => { load(); }, [load]);

  const del = async (id: string) => { if (confirm("Hapus data tamu ini?")) { await supabase.from("guests").delete().eq("id", id); load(); } };
  const save = async () => {
    if (!edit) return;
    await supabase.from("guests").update({ name: edit.name, institution: edit.institution, phone: edit.phone, notes: edit.notes, employee_id: edit.employee_id, visit_purpose_id: edit.visit_purpose_id }).eq("id", edit.id);
    setEdit(null); load();
  };
  const i = "rounded-lg border border-input bg-card px-3 py-2 text-sm";

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Data Tamu</h1>
      <div className="flex flex-wrap gap-2">
        <input className={`${i} min-w-0 flex-1 sm:flex-none sm:w-64`} type="search" placeholder="Cari nama / instansi / telepon" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
        <label className="flex items-center gap-1 text-sm text-muted-foreground">Dari<input className={i} type="date" value={date} onChange={(e) => { setDate(e.target.value); setPage(0); }} /></label>
        <label className="flex items-center gap-1 text-sm text-muted-foreground">Sampai<input className={i} type="date" value={dateTo} min={date || undefined} onChange={(e) => { setDateTo(e.target.value); setPage(0); }} /></label>
        <select className={i} value={purpose} onChange={(e) => { setPurpose(e.target.value); setPage(0); }}><option value="">Semua tujuan</option>{purps.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <select className={i} value={emp} onChange={(e) => { setEmp(e.target.value); setPage(0); }}><option value="">Semua karyawan</option>{emps.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <button className={i} onClick={() => { setQ(""); setDate(""); setDateTo(""); setPurpose(""); setEmp(""); setPage(0); }}>Reset filter</button>
      </div>
      <p className="text-sm text-muted-foreground">{count} kunjungan ditemukan</p>
      <div className="overflow-x-auto rounded-xl bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left"><tr>
            <th className="cursor-pointer p-3" onClick={() => setAsc(!asc)}>Waktu {asc ? "↑" : "↓"}</th>
            <th className="p-3">Nama</th><th className="p-3">Instansi</th><th className="p-3">Telepon</th><th className="p-3">Tujuan</th><th className="p-3">Dituju</th><th className="p-3"></th>
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-3">{new Date(r.check_in_time).toLocaleString("id-ID")}</td>
                <td className="p-3">{r.name}</td><td className="p-3">{r.institution}</td><td className="p-3">{r.phone}</td>
                <td className="p-3">{r.visit_purposes?.name}</td><td className="p-3">{r.employees?.name}</td>
                <td className="whitespace-nowrap p-3"><button className="mr-3 text-primary" onClick={() => setEdit(r)}>Edit</button><button className="text-destructive" onClick={() => del(r.id)}>Hapus</button></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Tidak ada data.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <button disabled={page === 0} className={i} onClick={() => setPage(page - 1)}>Sebelumnya</button>
        <span>Halaman {page + 1} dari {Math.max(1, Math.ceil(count / PAGE))}</span>
        <button disabled={(page + 1) * PAGE >= count} className={i} onClick={() => setPage(page + 1)}>Berikutnya</button>
      </div>

      {edit && (
        <div className="fixed inset-0 flex items-center justify-center bg-foreground/40 p-4">
          <div className="w-full max-w-md space-y-3 rounded-xl bg-card p-6">
            <h2 className="font-semibold">Edit Tamu</h2>
            <input className={`${i} w-full`} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            <input className={`${i} w-full`} value={edit.institution} onChange={(e) => setEdit({ ...edit, institution: e.target.value })} />
            <input className={`${i} w-full`} value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} />
            <select className={`${i} w-full`} value={edit.visit_purpose_id ?? ""} onChange={(e) => setEdit({ ...edit, visit_purpose_id: e.target.value })}>{purps.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <select className={`${i} w-full`} value={edit.employee_id ?? ""} onChange={(e) => setEdit({ ...edit, employee_id: e.target.value })}>{emps.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <textarea className={`${i} w-full`} value={edit.notes ?? ""} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} />
            <div className="flex justify-end gap-2"><button className={i} onClick={() => setEdit(null)}>Batal</button><button className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground" onClick={save}>Simpan</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
