/**
 * @module routes/admin.tujuan
 * @description Halaman pengelolaan data master tujuan kunjungan (`/admin/tujuan`).
 * Membungkus komponen generik `MasterCrud` untuk tabel `visit_purposes`.
 */
import { createFileRoute } from "@tanstack/react-router";
import { MasterCrud } from "@/components/MasterCrud";

export const Route = createFileRoute("/admin/tujuan")({
  component: () => <MasterCrud table="visit_purposes" title="Tujuan Kunjungan" />,
});
