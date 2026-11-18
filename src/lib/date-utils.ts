/**
 * Utilitas Pemformatan Tanggal & Waktu Standar Indonesia Barat (`Asia/Jakarta` / WIB).
 *
 * Memusatkan seluruh konversi zona waktu agar SSR dan perangkat klien di zona waktu berbeda
 * tetap menampilkan jam/tanggal lobi Menara Nobu secara seragam dalam WIB.
 */

/**
 * Mengurai input tanggal (`Date`, ISO string, atau timestamp) secara aman.
 * Mengembalikan `null` jika input kosong atau tidak menghasilkan tanggal valid (`NaN`).
 */
export function parseValidDate(input: Date | string | number | null | undefined): Date | null {
  if (!input) return null;
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Menghasilkan ucapan salam sesuai jam waktu lokal (Pagi < 11, Siang < 15, Sore < 19, Malam >= 19).
 */
export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 19) return "Selamat sore";
  return "Selamat malam";
}

/**
 * Format jam dan menit standar WIB: `"14:30"` (atau `"14:30:45"` bila `includeSeconds = true`).
 */
export function formatWibTime(
  input: Date | string | number | null | undefined,
  includeSeconds = false,
): string {
  const d = parseValidDate(input);
  if (!d) return "-";
  return d.toLocaleTimeString("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    ...(includeSeconds ? { second: "2-digit" } : {}),
    hour12: false,
  });
}

/**
 * Waktu sekarang dalam format jam WIB: "14:30"
 */
export function getNowWibTimeString(includeSeconds = false): string {
  return formatWibTime(new Date(), includeSeconds);
}

/**
 * Tanggal sekarang dalam format standar WIB: "17 Okt 2026"
 */
export function getNowWibDateString(): string {
  return formatWibDate(new Date(), true);
}

/**
 * Format tanggal standar: "17 Okt 2026"
 */
export function formatWibDate(
  input: Date | string | number | null | undefined,
  includeYear = true,
): string {
  const d = parseValidDate(input);
  if (!d) return "-";
  return d.toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    ...(includeYear ? { year: "numeric" } : {}),
  });
}

/**
 * Format lengkap tanggal dan waktu: "17 Okt 2026, 14:30 WIB"
 */
export function formatWibDateTime(
  input: Date | string | number | null | undefined,
  includeYear = true,
): string {
  const d = parseValidDate(input);
  if (!d) return "-";
  const datePart = formatWibDate(d, includeYear);
  const timePart = formatWibTime(d);
  return `${datePart}, ${timePart} WIB`;
}

/**
 * Format tanggal hari untuk header / dashboard: "Sab, 17 Okt"
 */
export function formatWibWeekdayDate(input: Date | string | number | null | undefined): string {
  const d = parseValidDate(input);
  if (!d) return "-";
  return d.toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
