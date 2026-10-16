import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin/email-admin")({
  component: AdminEmails,
});

type Row = { email: string; created_at: string };

function AdminEmails() {
  const [rows, setRows] = useState<Row[]>([]);
  const [email, setEmail] = useState("");
  const [me, setMe] = useState("");
  const [msg, setMsg] = useState("");
  const load = useCallback(async () => {
    const { data } = await supabase.from("admin_emails").select("*").order("email");
    setRows((data as Row[]) ?? []);
  }, []);
  useEffect(() => { load(); supabase.auth.getUser().then(({ data }) => setMe(data.user?.email?.toLowerCase() ?? "")); }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg("");
    const r = z.string().trim().toLowerCase().email().max(255).safeParse(email);
    if (!r.success) return setMsg("Email tidak valid.");
    const { error } = await supabase.from("admin_emails").insert({ email: r.data });
    if (error) return setMsg(error.code === "23505" ? "Email sudah terdaftar." : "Gagal menyimpan. Pastikan skrip database terbaru sudah dijalankan.");
    toast.success("Email admin ditambahkan"); setEmail(""); setMsg("Ditambahkan. Jika akunnya sudah ada, langsung menjadi admin.");
    load();
  };
  const [toDelete, setToDelete] = useState<string | null>(null);
  const remove = async () => {
    if (!toDelete) return;
    const { error } = await supabase.from("admin_emails").delete().eq("email", toDelete);
    if (error) { toast.error("Gagal menghapus email admin"); return; }
    toast.success(`${toDelete} dihapus dari admin`); load();
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Email Admin</h1>
        <p className="text-sm text-muted-foreground">Email di daftar ini otomatis mendapat akses admin saat akunnya dibuat atau sudah ada.</p>
      </div>
      <form onSubmit={add} className="flex flex-wrap gap-2">
        <input type="email" className="min-h-11 flex-1 rounded-lg border border-input bg-card px-3 text-sm" placeholder="nama@perusahaan.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button className="min-h-11 rounded-lg bg-primary px-4 text-sm text-primary-foreground">Tambah</button>
      </form>
      {msg && <p className="text-sm text-primary">{msg}</p>}
      <div className="rounded-xl bg-card">
        {rows.length === 0 && <p className="p-3 text-sm text-muted-foreground">Belum ada email.</p>}
        {rows.map((r) => (
          <div key={r.email} className="flex items-center gap-3 border-b border-border p-3 text-sm last:border-0">
            <span className="flex-1 break-all text-foreground">{r.email}{r.email === me && <span className="ml-2 text-xs text-muted-foreground">(Anda)</span>}</span>
            {r.email !== me && <button className="min-h-11 px-2 text-destructive" onClick={() => setToDelete(r.email)}>Hapus</button>}
          </div>
        ))}
      </div>
      <ConfirmDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)} title="Cabut akses admin?" description={`${toDelete ?? ""} akan dihapus dari daftar dan akses adminnya langsung dicabut.`} confirmLabel="Hapus & cabut" onConfirm={remove} />
    </div>
  );
}
