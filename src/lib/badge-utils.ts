import type { Guest } from "@/lib/supabase";
import { formatWibDate, formatWibTime } from "@/lib/date-utils";

/** Struktur data terstandar yang dibutuhkan untuk merender & mengekspor Kartu Tamu (Visitor Pass). */
export interface VisitorBadgeData {
  /** UUID kunjungan di database (opsional jika masih offline/sementara). */
  id?: string | undefined;
  /** Nama lengkap pengunjung. */
  name: string;
  /** Nama instansi atau perusahaan asal pengunjung. */
  institution: string;
  /** Nomor ponsel pengunjung (disembunyikan/disensor di cetak tertentu bila perlu). */
  phone?: string | undefined;
  /** Nama staf/host yang ditemui; kosong berarti Resepsionis Lobi. */
  employeeName?: string | undefined;
  /** Kategori tujuan atau keperluan kunjungan. */
  purposeName?: string | undefined;
  /** Waktu check-in terformat WIB (mis. `"14:30"`). */
  checkInTime?: string | undefined;
  /** Tanggal check-in terformat WIB (mis. `"17 Okt 2026"`). */
  checkInDate?: string | undefined;
  /** Kode unik badge resmi dari database (mis. `"VTR-001"`). */
  badgeNumber?: string | undefined;
}

/**
 * Pemetaan terpusat objek `Guest` dari database ke `VisitorBadgeData` untuk modal cetak badge.
 * Menghilangkan duplikasi fungsi `openBadgeForGuest` / `openBadgeModal` antar komponen.
 */
export function createVisitorBadgeFromGuest(r: Guest): VisitorBadgeData {
  return {
    id: r.id,
    name: r.name,
    institution: r.institution,
    phone: r.phone,
    employeeName: r.employees?.name ?? undefined,
    purposeName: r.visit_purposes?.name ?? undefined,
    checkInTime: formatWibTime(r.check_in_time),
    checkInDate: formatWibDate(r.check_in_time, true),
    badgeNumber: r.badge_code || undefined,
  };
}
