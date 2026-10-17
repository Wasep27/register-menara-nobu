/**
 * Format tanggal dan waktu standar Indonesia Barat (WIB).
 * Menghindari duplikasi pemanggilan Intl.DateTimeFormat dan toLocaleDateString/Time across components.
 */

export function parseValidDate(input: Date | string | number | null | undefined): Date | null {
  if (!input) return null;
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Format jam dan menit standar: "14:30"
 */
export function formatWibTime(input: Date | string | number | null | undefined): string {
  const d = parseValidDate(input);
  if (!d) return "-";
  return d.toLocaleTimeString("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
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
export function formatWibDateTime(input: Date | string | number | null | undefined): string {
  const d = parseValidDate(input);
  if (!d) return "-";
  const datePart = formatWibDate(d, true);
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
