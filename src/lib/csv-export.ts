/**
 * Utility terpusat untuk ekspor data tabel ke file CSV (Excel-compatible).
 * Menghindari duplikasi kode escape, pembuatan Blob, dan manipulasi elemen <a>.
 */

/**
 * Membersihkan nilai sel CSV untuk mencegah CSV Formula Injection
 * dan memastikan tanda petik ganda ter-escape dengan benar.
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  let str = String(value).trim();
  // Cegah CSV / Spreadsheet formula injection (=, +, -, @)
  if (/^[=+\-@]/.test(str)) {
    str = "'" + str;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

export interface CsvExportOptions {
  filename: string;
  headers: string[];
  rows: unknown[][];
}

/**
 * Mengunduh sekumpulan baris data sebagai file CSV bertanda UTF-8 BOM.
 */
export function exportToCsv({ filename, headers, rows }: CsvExportOptions): void {
  const headerLine = headers.map(escapeCsvCell).join(",");
  const dataLines = rows.map((row) => row.map(escapeCsvCell).join(","));
  const csvContent = "\ufeff" + [headerLine, ...dataLines].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  const finalName = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  anchor.href = url;
  anchor.download = finalName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 30000);
}
