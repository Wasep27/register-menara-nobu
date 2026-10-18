import { z } from "zod";

const NAME_RE = /^[\p{L}][\p{L} .,'-]*$/u;

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

export const purposeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama tujuan wajib diisi")
    .min(2, "Nama tujuan minimal 2 karakter")
    .max(100, "Nama tujuan maksimal 100 karakter"),
});

export function fieldErrors(issues: z.ZodIssue[]) {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const k = String(i.path[0]);
    if (!out[k]) out[k] = i.message;
  }
  return out;
}
