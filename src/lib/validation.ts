/**
 * Skema Validasi Formulir Terpusat Berbasis Zod (`src/lib/validation.ts`).
 *
 * Digunakan bersama oleh formulir registrasi tamu, manajemen master karyawan/tujuan,
 * serta diuji di `src/test/validation.test.ts` agar aturan bisnis frontend selalu konsisten
 * dengan validasi RPC di sisi database Supabase.
 */
import { z } from "zod";

/** Pola Unicode huruf latin/internasional serta tanda baca nama wajar (tanpa angka/simbol berbahaya). */
const NAME_RE = /^[\p{L}][\p{L} .,'-]*$/u;

/**
 * Skema validasi formulir registrasi kunjungan tamu:
 * - Memvalidasi format nama, instansi, nomor HP Indonesia (`+62`/`62`/`08...`), tujuan wajib,
 *   serta jadwal kunjungan opsional (toleransi 5 menit ke belakang hingga maks 180 hari ke depan).
 */
export const guestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama lengkap wajib diisi")
    .min(2, "Nama minimal 2 huruf")
    .max(100, "Nama maksimal 100 karakter")
    .regex(NAME_RE, "Nama hanya boleh berisi huruf, spasi, titik, koma, atau tanda hubung"),
  institution: z
    .string()
    .trim()
    .min(1, "Instansi / perusahaan wajib diisi")
    .min(2, "Instansi minimal 2 karakter")
    .max(150, "Instansi maksimal 150 karakter"),
  phone: z
    .string()
    .trim()
    .min(1, "Nomor telepon wajib diisi")
    .regex(/^(\+62|62|0)8[0-9 -]{7,15}$/, "Gunakan nomor ponsel Indonesia, contoh 0812 3456 7890"),
  visit_purpose_id: z.string().min(1, "Pilih tujuan kunjungan"),
  employee_id: z.string().optional(),
  notes: z.string().max(500, "Catatan maksimal 500 karakter").optional(),
  scheduled_at: z
    .string()
    .optional()
    .refine((v) => !v || !Number.isNaN(new Date(v).getTime()), "Format tanggal tidak valid")
    .refine(
      (v) => !v || new Date(v).getTime() > Date.now() - 5 * 60_000,
      "Jadwal harus di masa depan",
    )
    .refine(
      (v) => !v || new Date(v).getTime() < Date.now() + 180 * 86_400_000,
      "Jadwal maksimal 180 hari dari sekarang",
    ),
  is_important: z.string().optional(),
});

/** Skema validasi data master karyawan / host penerima tamu. */
export const employeeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama karyawan wajib diisi")
    .min(2, "Nama minimal 2 huruf")
    .max(100, "Nama maksimal 100 karakter")
    .regex(NAME_RE, "Nama hanya boleh berisi huruf, spasi, titik, koma, atau tanda hubung"),
  department: z.string().trim().max(100, "Departemen maksimal 100 karakter"),
  email: z
    .string()
    .trim()
    .max(255, "Email maksimal 255 karakter")
    .refine(
      (v) => !v || z.string().email().safeParse(v).success,
      "Format email tidak valid, contoh nama@nobu.id",
    ),
});

/** Skema validasi data master kategori tujuan / keperluan kunjungan. */
export const purposeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama tujuan wajib diisi")
    .min(2, "Nama tujuan minimal 2 karakter")
    .max(100, "Nama tujuan maksimal 100 karakter"),
});

/**
 * Mengonversi array `ZodIssue` menjadi kamus `{ [namaField]: pesanErrorPertama }`
 * agar UI formulir langsung menampilkan pesan error paling relevan di bawah masing-masing input.
 */
export function fieldErrors(issues: z.ZodIssue[]) {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const k = String(i.path[0]);
    if (!out[k]) out[k] = i.message;
  }
  return out;
}
