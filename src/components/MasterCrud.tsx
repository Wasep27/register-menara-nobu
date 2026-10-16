import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type Row = { id: string; name: string; department?: string | null; email?: string | null; is_active: boolean };

export function MasterCrud({ table, title, withDept }: { table: "employees" | "visit_purposes"; title: string; withDept?: boolean }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [name, setName] = useState("");
  const [dept, setDept] = useState("");
  const [email, setEmail] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Row | null>(null);
  const label = table === "employees" ? "karyawan" : "tujuan kunjungan";

  const load = useCallback(async () => {
    const { data, error } = await supabase.from(table).select("*").order("name");
    if (error) toast.error("Gagal memuat data");
    setRows((data as Row[]) ?? []);
  }, [table]);
  useEffect(() => { load(); }, [load]);

  const openForm = (r?: Row) => {
    setEditId(r?.id ?? null); setName(r?.name ?? ""); setDept(r?.department ?? ""); setEmail(r?.email ?? "");
    setFormOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) { toast.error("Nama minimal 2 huruf"); return; }
    const payload: Record<string, unknown> = { name: name.trim() };
    if (withDept) { payload["department"] = dept.trim() || null; payload["email"] = email.trim().toLowerCase() || null; }
    setSaving(true);
    const { error } = editId
      ? await supabase.from(table).update(payload).eq("id", editId)
      : await supabase.from(table).insert(payload);
    setSaving(false);
    if (error) { toast.error(error.code === "23505" ? "Data sudah ada" : "Gagal menyimpan"); return; }
    toast.success(editId ? `Data ${label} diperbarui` : `Data ${label} ditambahkan`);
    setFormOpen(false); load();
  };

  const toggle = async (r: Row) => {
    const { error } = await supabase.from(table).update({ is_active: !r.is_active }).eq("id", r.id);
    if (error) { toast.error("Gagal mengubah status"); return; }
    toast.success(`${r.name} ${r.is_active ? "dinonaktifkan" : "diaktifkan"}`);
    load();
  };

  const remove = async () => {
    if (!toDelete) return;
    const { error } = await supabase.from(table).delete().eq("id", toDelete.id);
    if (error) { toast.error("Gagal menghapus. Data mungkin masih dipakai oleh tamu — nonaktifkan saja."); return; }
    toast.success(`${toDelete.name} dihapus`);
    load();
  };

  const i = "min-h-11 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm";
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <button className="min-h-11 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground" onClick={() => openForm()}>+ Tambah</button>
      </div>
      <div className="rounded-xl bg-card">
        {rows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-3 border-b border-border p-3 text-sm last:border-0">
            <span className="min-w-0 flex-1">{r.name}{r.department ? <span className="text-muted-foreground"> · {r.department}</span> : null}{r.email ? <span className="block text-xs text-muted-foreground">{r.email}</span> : null}</span>
            <button className={`rounded-full px-3 py-1 text-xs ${r.is_active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`} onClick={() => toggle(r)}>{r.is_active ? "Aktif" : "Nonaktif"}</button>
            <button className="text-primary" onClick={() => openForm(r)}>Edit</button>
            <button className="text-destructive" onClick={() => setToDelete(r)}>Hapus</button>
          </div>
        ))}
        {rows.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Belum ada data.</p>}
      </div>

      <Dialog open={formOpen} onOpenChange={(o) => !saving && setFormOpen(o)}>
        <DialogContent className="rounded-2xl">
          <form onSubmit={save} className="space-y-3">
            <DialogHeader>
              <DialogTitle>{editId ? `Edit ${label}` : `Tambah ${label}`}</DialogTitle>
              <DialogDescription>Isi data lalu tekan Simpan.</DialogDescription>
            </DialogHeader>
            <input autoFocus className={i} placeholder="Nama" value={name} onChange={(e) => setName(e.target.value)} />
            {withDept && <input className={i} placeholder="Departemen" value={dept} onChange={(e) => setDept(e.target.value)} />}
            {withDept && <input className={i} type="email" placeholder="Email login (untuk notifikasi)" value={email} onChange={(e) => setEmail(e.target.value)} />}
            <DialogFooter className="gap-2">
              <button type="button" className="min-h-11 rounded-lg border border-input px-4 text-sm" onClick={() => setFormOpen(false)} disabled={saving}>Batal</button>
              <button className="min-h-11 rounded-lg bg-primary px-4 text-sm text-primary-foreground" disabled={saving}>{saving ? "Menyimpan…" : "Simpan"}</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Hapus ${label}?`}
        description={`"${toDelete?.name ?? ""}" akan dihapus permanen dan tidak bisa dikembalikan.`}
        onConfirm={remove}
      />
    </div>
  );
}
