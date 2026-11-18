/**
 * @module routes/admin.karyawan
 * @description Halaman pengelolaan data master karyawan penerima tamu (`/admin/karyawan`).
 * Membungkus komponen generik `MasterCrud` untuk tabel `employees` dengan kolom divisi/departemen aktif.
 */
import { createFileRoute } from "@tanstack/react-router";
import { MasterCrud } from "@/components/MasterCrud";

export const Route = createFileRoute("/admin/karyawan")({
  component: () => <MasterCrud table="employees" title="Karyawan" withDept />,
});
