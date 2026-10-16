import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Row = { id: string; name: string; department?: string | null; is_active: boolean };

export function MasterCrud({ table, title, withDept }: { table: "employees" | "visit_purposes"; title: string; withDept?: boolean }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [name, setName] = useState("");
  const [dept, setDept] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const load = useCallback(async () => {
    const { data } = await supabase.from(table).select("*").order("name");
    setRows((data as Row[]) ?? []);
  }, [table]);
  useEffect(() => { load(); }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return;
    const payload: Record<string, unknown> = { name: name.trim() };
    if (withDept) payload.department = dept.trim() || null;
    if (editId) await supabase.from(table).update(payload).eq("id", editId);
    else await supabase.from(table).insert(payload);
    setName(""); setDept(""); setEditId(null); load();
  };
  const i = "rounded-lg border border-input bg-card px-3 py-2 text-sm";
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      <form onSubmit={save} className="flex flex-wrap gap-2">
        <input className={i} placeholder="Nama" value={name} onChange={(e) => setName(e.target.value)} />
        {withDept && <input className={i} placeholder="Departemen" value={dept} onChange={(e) => setDept(e.target.value)} />}
        <button className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">{editId ? "Simpan" : "Tambah"}</button>
        {editId && <button type="button" className={i} onClick={() => { setEditId(null); setName(""); setDept(""); }}>Batal</button>}
      </form>
      <div className="rounded-xl bg-card">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-3 border-b border-border p-3 text-sm last:border-0">
            <span className="flex-1">{r.name}{r.department ? <span className="text-muted-foreground"> · {r.department}</span> : null}</span>
            <button className={`rounded-full px-3 py-1 text-xs ${r.is_active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`} onClick={async () => { await supabase.from(table).update({ is_active: !r.is_active }).eq("id", r.id); load(); }}>{r.is_active ? "Aktif" : "Nonaktif"}</button>
            <button className="text-primary" onClick={() => { setEditId(r.id); setName(r.name); setDept(r.department ?? ""); }}>Edit</button>
            <button className="text-destructive" onClick={async () => { if (confirm("Hapus?")) { await supabase.from(table).delete().eq("id", r.id); load(); } }}>Hapus</button>
          </div>
        ))}
      </div>
    </div>
  );
}
